-- Create delivery status updates for historical delivered orders
-- This will add approximate delivery dates for orders that were marked as delivered before the tracking fix

INSERT INTO public.delivery_status_updates (
  order_id,
  driver_id,
  old_status,
  new_status,
  notes,
  created_at
)
SELECT 
  o.id as order_id,
  COALESCE(o.driver_id, o.admin_id) as driver_id,
  'en_route'::order_status as old_status,
  'delivered'::order_status as new_status,
  'Historical delivery record created during system migration' as notes,
  o.updated_at as created_at
FROM public.orders o
WHERE o.status = 'delivered'
  AND o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.delivery_status_updates dsu
    WHERE dsu.order_id = o.id 
    AND dsu.new_status = 'delivered'
  );