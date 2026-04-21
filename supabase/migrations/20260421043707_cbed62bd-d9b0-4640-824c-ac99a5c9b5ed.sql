DO $$
DECLARE
  rec RECORD;
  corrected_count int := 0;
BEGIN
  FOR rec IN
    SELECT id, order_number, total_amount,
           COALESCE(subtotal,0) AS subtotal,
           COALESCE(delivery_fee,0) AS delivery_fee,
           COALESCE(adjustments,0) AS adjustments,
           COALESCE(fuel_surcharge,0) AS fuel_surcharge,
           admin_id, payment_method
    FROM public.orders
    WHERE delivery_method = 'pickup'
      AND deleted_at IS NULL
      AND payment_status = 'paid'
      AND total_amount > (COALESCE(subtotal,0) + COALESCE(delivery_fee,0) + COALESCE(adjustments,0) + COALESCE(fuel_surcharge,0)) + 0.01
  LOOP
    INSERT INTO public.activity_logs (
      action_type, target_type, target_id, admin_id, description, target_details, old_values, new_values
    ) VALUES (
      'pickup_phantom_surcharge_corrected',
      'order',
      rec.id,
      COALESCE(rec.admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
      'Corrected paid pickup order ' || rec.order_number || ' total from $' || rec.total_amount || ' to $' || (rec.subtotal + rec.delivery_fee + rec.adjustments + rec.fuel_surcharge) || '. Customer was overcharged $' || (rec.total_amount - (rec.subtotal + rec.delivery_fee + rec.adjustments + rec.fuel_surcharge)) || ' via ' || COALESCE(rec.payment_method,'unknown') || ' — manual refund required.',
      jsonb_build_object(
        'overcharge_amount', rec.total_amount - (rec.subtotal + rec.delivery_fee + rec.adjustments + rec.fuel_surcharge),
        'payment_method', rec.payment_method,
        'requires_refund', true
      ),
      jsonb_build_object('total_amount', rec.total_amount, 'fuel_surcharge', rec.fuel_surcharge),
      jsonb_build_object('total_amount', rec.subtotal + rec.delivery_fee + rec.adjustments + rec.fuel_surcharge, 'fuel_surcharge', rec.fuel_surcharge)
    );

    UPDATE public.orders
    SET total_amount = rec.subtotal + rec.delivery_fee + rec.adjustments + rec.fuel_surcharge,
        updated_at = now()
    WHERE id = rec.id;

    corrected_count := corrected_count + 1;
  END LOOP;

  RAISE NOTICE 'Corrected % paid pickup orders with phantom surcharge.', corrected_count;
END $$;