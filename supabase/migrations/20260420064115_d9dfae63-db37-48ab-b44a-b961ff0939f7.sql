-- Repair delivery orders missing fuel_surcharge from the last 60 days
DO $$
DECLARE
  current_fuel_surcharge numeric;
  repaired_count int := 0;
  flagged_paid_count int := 0;
  rec RECORD;
BEGIN
  SELECT COALESCE(fuel_surcharge, 0) INTO current_fuel_surcharge
  FROM public.payment_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF current_fuel_surcharge IS NULL OR current_fuel_surcharge <= 0 THEN
    RAISE NOTICE 'No positive fuel surcharge configured; skipping repair.';
    RETURN;
  END IF;

  -- Flag paid orders for manual review (do NOT change financials)
  FOR rec IN
    SELECT id, order_number, total_amount, COALESCE(subtotal,0) AS subtotal,
           COALESCE(delivery_fee,0) AS delivery_fee, COALESCE(adjustments,0) AS adjustments,
           admin_id
    FROM public.orders
    WHERE delivery_method = 'delivery'
      AND COALESCE(fuel_surcharge, 0) = 0
      AND deleted_at IS NULL
      AND created_at >= now() - interval '60 days'
      AND payment_status = 'paid'
  LOOP
    INSERT INTO public.activity_logs (
      action_type, target_type, target_id, admin_id, description, target_details
    ) VALUES (
      'fuel_surcharge_review_required',
      'order',
      rec.id,
      COALESCE(rec.admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'Order ' || rec.order_number || ' is paid but missing fuel surcharge ($' || current_fuel_surcharge || '). Manual review required.',
      jsonb_build_object(
        'expected_fuel_surcharge', current_fuel_surcharge,
        'current_total', rec.total_amount,
        'subtotal', rec.subtotal,
        'delivery_fee', rec.delivery_fee,
        'adjustments', rec.adjustments
      )
    );
    flagged_paid_count := flagged_paid_count + 1;
  END LOOP;

  -- Repair unpaid delivery orders: apply fuel surcharge and recompute total
  WITH updated AS (
    UPDATE public.orders
    SET fuel_surcharge = current_fuel_surcharge,
        total_amount = COALESCE(subtotal, 0) + COALESCE(delivery_fee, 0)
                       + COALESCE(adjustments, 0) + current_fuel_surcharge,
        updated_at = now()
    WHERE delivery_method = 'delivery'
      AND COALESCE(fuel_surcharge, 0) = 0
      AND deleted_at IS NULL
      AND created_at >= now() - interval '60 days'
      AND COALESCE(payment_status, 'pending') <> 'paid'
    RETURNING id
  )
  SELECT count(*) INTO repaired_count FROM updated;

  RAISE NOTICE 'Fuel surcharge repair complete: % repaired, % paid orders flagged.', repaired_count, flagged_paid_count;
END $$;