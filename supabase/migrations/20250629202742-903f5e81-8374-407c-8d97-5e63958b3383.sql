
-- Fix Supabase Security Advisory: Remove SECURITY DEFINER from orders_export_view
DROP VIEW IF EXISTS public.orders_export_view CASCADE;

CREATE VIEW public.orders_export_view AS
SELECT 
  o.id,
  o.order_number,
  o.purchase_order,
  o.created_at,
  o.updated_at,
  
  -- Customer Information
  o.customer_name,
  o.customer_phone,
  c.email as customer_email,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.company_name,
  c.business_name,
  
  -- Address Information
  o.customer_address as billing_address,
  o.delivery_address,
  s.name as suburb_name,
  s.state as suburb_state,
  s.postcode as suburb_postcode,
  
  -- Financial Information
  o.subtotal,
  o.adjustments,
  o.delivery_fee,
  o.total_amount,
  o.payment_method,
  o.payment_status,
  
  -- Order Status and Assignment
  o.status as order_status,
  o.delivery_method,
  o.truck_type,
  tr.registration_number as truck_registration,
  tr.truck_type as assigned_truck_type,
  p.full_name as driver_name,
  
  -- Delivery Information
  o.delivery_date,
  o.delivery_time,
  
  -- Notes
  o.order_notes,
  o.delivery_notes,
  o.special_instructions,
  
  -- Split Order Information
  o.is_split_order,
  o.split_number,
  o.master_order_id,
  
  -- Products formatted as comma-separated string
  CASE 
    WHEN jsonb_array_length(o.products) > 0 THEN
      (
        SELECT string_agg(
          product_item.product_name || ' (Qty: ' || product_item.quantity || ', Price: $' || product_item.price || ')',
          ', '
        )
        FROM (
          SELECT 
            (item->>'name')::text as product_name,
            (item->>'quantity')::text as quantity,
            (item->>'price')::numeric as price
          FROM jsonb_array_elements(o.products) as item
        ) as product_item
      )
    ELSE 'No products'
  END as products_formatted,
  
  -- Product count
  jsonb_array_length(o.products) as product_count,
  
  -- Timestamps formatted for easy reading
  to_char(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_formatted,
  to_char(o.delivery_date, 'YYYY-MM-DD') as delivery_date_formatted,
  to_char(o.delivery_time, 'HH24:MI') as delivery_time_formatted,
  
  -- Deleted status
  CASE WHEN o.deleted_at IS NOT NULL THEN 'Deleted' ELSE 'Active' END as record_status,
  o.deleted_at,
  deleted_by_profile.full_name as deleted_by_name

FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.suburbs s ON c.suburb_id = s.id
LEFT JOIN public.profiles p ON o.driver_id = p.id
LEFT JOIN public.trucks tr ON o.truck_id = tr.id
LEFT JOIN public.profiles deleted_by_profile ON o.deleted_by = deleted_by_profile.id
ORDER BY o.created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON public.orders_export_view TO authenticated;
