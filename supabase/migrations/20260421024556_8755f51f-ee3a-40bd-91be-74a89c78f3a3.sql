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
    RAISE NOTICE 'No positive fuel surcharge configured; skipping pickup repair.';
    RETURN;
  END IF;

  -- Flag PAID pickup orders inflated by ~current fuel surcharge for manual review (no financial change)
  FOR rec IN
    SELECT id, order_number, total_amount,
           COALESCE(subtotal,0) AS subtotal,
           COALESCE(delivery_fee,0) AS delivery_fee,
           COALESCE(adjustments,0) AS adjustments,
           COALESCE(fuel_surcharge,0) AS fuel_surcharge,
           admin_id
    FROM public.orders
    WHERE delivery_method = 'pickup'
      AND deleted_at IS NULL
      AND payment_status = 'paid'
      AND ABS(
        total_amount
        - (COALESCE(subtotal,0) + COALESCE(delivery_fee,0) + COALESCE(adjustments,0))
      ) BETWEEN (current_fuel_surcharge - 0.01) AND (current_fuel_surcharge + 0.01)
  LOOP
    INSERT INTO public.activity_logs (
      action_type, target_type, target_id, admin_id, description, target_details
    ) VALUES (
      'pickup_phantom_surcharge_review_required',
      'order',
      rec.id,
      COALESCE(rec.admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'Pickup order ' || rec.order_number || ' total appears inflated by phantom fuel surcharge ($' || current_fuel_surcharge || '). Order is paid — manual review/refund required.',
      jsonb_build_object(
        'expected_total', rec.subtotal + rec.delivery_fee + rec.adjustments,
        'current_total', rec.total_amount,
        'difference', rec.total_amount - (rec.subtotal + rec.delivery_fee + rec.adjustments),
        'subtotal', rec.subtotal,
        'delivery_fee', rec.delivery_fee,
        'adjustments', rec.adjustments,
        'stored_fuel_surcharge', rec.fuel_surcharge
      )
    );
    flagged_paid_count := flagged_paid_count + 1;
  END LOOP;

  -- Auto-repair UNPAID pickup orders: zero out fuel_surcharge and recompute total
  WITH updated AS (
    UPDATE public.orders
    SET fuel_surcharge = 0,
        total_amount = COALESCE(subtotal,0) + COALESCE(delivery_fee,0) + COALESCE(adjustments,0),
        updated_at = now()
    WHERE delivery_method = 'pickup'
      AND deleted_at IS NULL
      AND COALESCE(payment_status, 'pending') <> 'paid'
      AND total_amount > (COALESCE(subtotal,0) + COALESCE(delivery_fee,0) + COALESCE(adjustments,0)) + 0.01
    RETURNING id
  )
  SELECT count(*) INTO repaired_count FROM updated;

  RAISE NOTICE 'Pickup phantom-surcharge repair complete: % unpaid repaired, % paid flagged.', repaired_count, flagged_paid_count;
END $$;