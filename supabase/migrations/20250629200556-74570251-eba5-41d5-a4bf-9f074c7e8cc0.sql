
-- Fix the orders_export_view to use correct field names from products JSON
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
  
  -- Products formatted as comma-separated string (FIXED)
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

-- Clear and repopulate the orders_export table with corrected data
DELETE FROM public.orders_export;

-- Repopulate with corrected product formatting
INSERT INTO public.orders_export
SELECT 
  oev.id,
  oev.order_number,
  oev.purchase_order,
  oev.created_at,
  oev.updated_at,
  
  -- Customer Information
  oev.customer_name,
  oev.customer_phone,
  oev.customer_email,
  oev.customer_first_name,
  oev.customer_last_name,
  oev.company_name,
  oev.business_name,
  
  -- Address Information
  oev.billing_address,
  oev.delivery_address,
  oev.suburb_name,
  oev.suburb_state,
  oev.suburb_postcode,
  
  -- Financial Information
  oev.subtotal,
  oev.adjustments,
  oev.delivery_fee,
  oev.total_amount,
  oev.payment_method,
  oev.payment_status,
  
  -- Order Status and Assignment
  oev.order_status::text,
  oev.delivery_method::text,
  oev.truck_type::text,
  oev.truck_registration,
  oev.assigned_truck_type::text,
  oev.driver_name,
  
  -- Delivery Information
  oev.delivery_date,
  oev.delivery_time,
  
  -- Notes
  oev.order_notes,
  oev.delivery_notes,
  oev.special_instructions,
  
  -- Split Order Information
  oev.is_split_order,
  oev.split_number,
  oev.master_order_id,
  
  -- Formatted fields (now with correct products)
  oev.products_formatted,
  oev.product_count,
  oev.created_at_formatted,
  oev.delivery_date_formatted,
  oev.delivery_time_formatted,
  
  -- Status and metadata
  oev.record_status,
  oev.deleted_at,
  oev.deleted_by_name,
  
  -- Consolidated fields
  CONCAT(oev.suburb_name, ', ', oev.suburb_state, ' ', oev.suburb_postcode) as suburb_full,
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
  CONCAT_WS(' | ', 
    CASE WHEN oev.order_notes IS NOT NULL AND trim(oev.order_notes) != '' THEN 'Order: ' || oev.order_notes END,
    CASE WHEN oev.delivery_notes IS NOT NULL AND trim(oev.delivery_notes) != '' THEN 'Delivery: ' || oev.delivery_notes END,
    CASE WHEN oev.special_instructions IS NOT NULL AND trim(oev.special_instructions) != '' THEN 'Special: ' || oev.special_instructions END
  ) as all_notes
FROM public.orders_export_view oev;
