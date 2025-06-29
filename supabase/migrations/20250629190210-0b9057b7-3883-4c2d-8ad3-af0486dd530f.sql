
-- Drop the existing view and function to fix security issues
DROP VIEW IF EXISTS public.orders_export_view CASCADE;
DROP FUNCTION IF EXISTS public.get_order_export_data(uuid);

-- Recreate the comprehensive view for order export without security definer issues
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
          product_item.product_name || ' (Qty: ' || product_item.quantity || ', Price: $' || product_item.unit_price || ')',
          ', '
        )
        FROM (
          SELECT 
            (item->>'name')::text as product_name,
            (item->>'quantity')::text as quantity,
            (item->>'unit_price')::numeric as unit_price
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

-- Recreate the function with SECURITY INVOKER to respect RLS policies
CREATE OR REPLACE FUNCTION public.get_order_export_data(order_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  order_number text,
  purchase_order text,
  created_at_formatted text,
  customer_name text,
  customer_phone text,
  customer_email text,
  billing_address text,
  delivery_address text,
  suburb_full text,
  subtotal numeric,
  adjustments numeric,
  delivery_fee numeric,
  total_amount numeric,
  payment_method text,
  payment_status text,
  order_status text,
  driver_name text,
  truck_info text,
  delivery_schedule text,
  products_formatted text,
  all_notes text,
  record_status text
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oev.id,
    oev.order_number,
    oev.purchase_order,
    oev.created_at_formatted,
    oev.customer_name,
    oev.customer_phone,
    oev.customer_email,
    oev.billing_address,
    oev.delivery_address,
    CONCAT(oev.suburb_name, ', ', oev.suburb_state, ' ', oev.suburb_postcode) as suburb_full,
    oev.subtotal,
    oev.adjustments,
    oev.delivery_fee,
    oev.total_amount,
    oev.payment_method,
    oev.payment_status,
    oev.order_status::text,
    COALESCE(oev.driver_name, 'Not Assigned') as driver_name,
    CASE 
      WHEN oev.truck_registration IS NOT NULL THEN 
        CONCAT(oev.truck_registration, ' (', oev.assigned_truck_type, ')')
      WHEN oev.truck_type IS NOT NULL THEN 
        oev.truck_type::text
      ELSE 'Not Assigned'
    END as truck_info,
    CASE 
      WHEN oev.delivery_date IS NOT NULL AND oev.delivery_time IS NOT NULL THEN 
        CONCAT(oev.delivery_date_formatted, ' at ', oev.delivery_time_formatted)
      WHEN oev.delivery_date IS NOT NULL THEN 
        oev.delivery_date_formatted
      ELSE 'Not Scheduled'
    END as delivery_schedule,
    oev.products_formatted,
    CONCAT_WS(' | ', 
      CASE WHEN oev.order_notes IS NOT NULL AND trim(oev.order_notes) != '' THEN 'Order: ' || oev.order_notes END,
      CASE WHEN oev.delivery_notes IS NOT NULL AND trim(oev.delivery_notes) != '' THEN 'Delivery: ' || oev.delivery_notes END,
      CASE WHEN oev.special_instructions IS NOT NULL AND trim(oev.special_instructions) != '' THEN 'Special: ' || oev.special_instructions END
    ) as all_notes,
    oev.record_status
  FROM public.orders_export_view oev
  WHERE (order_id_param IS NULL OR oev.id = order_id_param)
    AND oev.deleted_at IS NULL -- Only active orders by default
  ORDER BY oev.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.orders_export_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_export_data TO authenticated;
