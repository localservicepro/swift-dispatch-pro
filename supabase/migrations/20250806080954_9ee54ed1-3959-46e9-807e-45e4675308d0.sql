-- Fix the remaining database functions to have proper search_path

CREATE OR REPLACE FUNCTION public.get_back_order_summary()
 RETURNS TABLE(product_id uuid, product_name text, total_back_ordered numeric, current_stock numeric, orders_count bigint)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(SUM((item->>'quantity')::numeric), 0) as total_back_ordered,
    p.stock_quantity,
    COUNT(DISTINCT o.id) as orders_count
  FROM products p
  LEFT JOIN orders o ON o.status = 'back_order' 
    AND o.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.products) as item 
      WHERE (item->>'id')::uuid = p.id
    )
  LEFT JOIN jsonb_array_elements(o.products) as item ON (item->>'id')::uuid = p.id
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.stock_quantity
  HAVING COALESCE(SUM((item->>'quantity')::numeric), 0) > 0
  ORDER BY total_back_ordered DESC, p.name ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_mixed_stock_availability(order_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  in_stock_count INTEGER := 0;
  out_of_stock_count INTEGER := 0;
  stock_check RECORD;
BEGIN
  -- Check stock for all items in the order
  FOR stock_check IN 
    SELECT is_sufficient 
    FROM check_stock_availability(
      (SELECT products FROM orders WHERE id = order_id_param)
    )
  LOOP
    IF stock_check.is_sufficient THEN
      in_stock_count := in_stock_count + 1;
    ELSE
      out_of_stock_count := out_of_stock_count + 1;
    END IF;
  END LOOP;
  
  -- Return true if we have both in-stock and out-of-stock items
  RETURN (in_stock_count > 0 AND out_of_stock_count > 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_stock_split_order(p_order_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  original_order orders%ROWTYPE;
  in_stock_products jsonb := '[]'::jsonb;
  out_of_stock_products jsonb := '[]'::jsonb;
  in_stock_total numeric := 0;
  out_of_stock_total numeric := 0;
  in_stock_order_id uuid;
  out_of_stock_order_id uuid;
  result_order_ids uuid[] := '{}';
  stock_check RECORD;
  product_item jsonb;
BEGIN
  -- Get the original order
  SELECT * INTO original_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;
  
  -- Separate products by stock availability
  FOR product_item IN SELECT * FROM jsonb_array_elements(original_order.products)
  LOOP
    -- Check stock for this specific product
    SELECT is_sufficient INTO stock_check
    FROM check_stock_availability(jsonb_build_array(product_item))
    LIMIT 1;
    
    IF stock_check THEN
      -- In stock - add to in_stock_products
      in_stock_products := in_stock_products || product_item;
      in_stock_total := in_stock_total + 
        COALESCE((product_item->>'price')::numeric, (product_item->>'unit_price')::numeric, 0) * 
        COALESCE((product_item->>'quantity')::numeric, 1);
    ELSE
      -- Out of stock - add to out_of_stock_products  
      out_of_stock_products := out_of_stock_products || product_item;
      out_of_stock_total := out_of_stock_total + 
        COALESCE((product_item->>'price')::numeric, (product_item->>'unit_price')::numeric, 0) * 
        COALESCE((product_item->>'quantity')::numeric, 1);
    END IF;
  END LOOP;
  
  -- Only proceed if we actually have mixed stock
  IF jsonb_array_length(in_stock_products) = 0 OR jsonb_array_length(out_of_stock_products) = 0 THEN
    RAISE EXCEPTION 'Order does not have mixed stock availability';
  END IF;
  
  -- Update original order to be the master order
  UPDATE orders 
  SET 
    is_split_order = true,
    products = in_stock_products,
    total_amount = in_stock_total,
    subtotal = in_stock_total,
    status = 'preparing'::order_status,
    updated_at = now()
  WHERE id = p_order_id;
  
  result_order_ids := array_append(result_order_ids, p_order_id);
  
  -- Create new order for out-of-stock items
  INSERT INTO orders (
    order_number,
    purchase_order,
    customer_name,
    customer_phone,
    customer_address,
    delivery_address,
    products,
    total_amount,
    subtotal,
    delivery_fee,
    adjustments,
    status,
    payment_status,
    payment_method,
    customer_id,
    delivery_date,
    delivery_time,
    delivery_method,
    truck_type,
    truck_id,
    driver_id,
    special_instructions,
    order_notes,
    delivery_notes,
    admin_id,
    is_split_order,
    master_order_id,
    split_number,
    same_as_billing,
    delivery_suburb_id,
    contact_id,
    contact_name,
    contact_email,
    contact_phone
  ) VALUES (
    original_order.order_number || '-STOCK',
    original_order.purchase_order,
    original_order.customer_name,
    original_order.customer_phone,
    original_order.customer_address,
    original_order.delivery_address,
    out_of_stock_products,
    out_of_stock_total,
    out_of_stock_total,
    0, -- No delivery fee for split order
    0, -- No adjustments for split order
    'back_order'::order_status,
    original_order.payment_status,
    original_order.payment_method,
    original_order.customer_id,
    original_order.delivery_date,
    original_order.delivery_time,
    original_order.delivery_method,
    original_order.truck_type,
    NULL, -- No truck assigned for back order
    NULL, -- No driver assigned for back order
    'Split from original order - items out of stock',
    original_order.order_notes,
    original_order.delivery_notes,
    auth.uid(),
    true,
    p_order_id,
    1,
    original_order.same_as_billing,
    original_order.delivery_suburb_id,
    original_order.contact_id,
    original_order.contact_name,
    original_order.contact_email,
    original_order.contact_phone
  ) RETURNING id INTO out_of_stock_order_id;
  
  result_order_ids := array_append(result_order_ids, out_of_stock_order_id);
  
  -- Log the split action
  PERFORM log_admin_activity(
    'stock_split_order',
    'order',
    p_order_id,
    jsonb_build_object(
      'in_stock_order_id', p_order_id,
      'out_of_stock_order_id', out_of_stock_order_id,
      'in_stock_total', in_stock_total,
      'out_of_stock_total', out_of_stock_total
    ),
    NULL,
    NULL,
    format('Split order %s by stock availability - created back order %s', 
           original_order.order_number, 
           original_order.order_number || '-STOCK')
  );
  
  RETURN result_order_ids;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_single_order(p_order_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  new_order_id uuid;
  order_number_val text;
BEGIN
  -- Generate order number if not provided
  order_number_val := COALESCE(p_order_data->>'order_number', 'ORD-' || extract(epoch from now())::bigint);
  
  -- Insert the order
  INSERT INTO public.orders (
    order_number,
    purchase_order,
    customer_name,
    customer_phone,
    customer_address,
    delivery_address,
    products,
    total_amount,
    subtotal,
    delivery_fee,
    adjustments,
    status,
    payment_status,
    payment_method,
    customer_id,
    delivery_date,
    delivery_time,
    delivery_method,
    truck_type,
    truck_id,
    driver_id,
    special_instructions,
    order_notes,
    delivery_notes,
    admin_id
  ) VALUES (
    order_number_val,
    p_order_data->>'purchase_order',
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    p_order_data->>'customer_address',
    COALESCE(p_order_data->>'delivery_address', p_order_data->>'customer_address'),
    (p_order_data->>'products')::jsonb,
    (p_order_data->>'total_amount')::numeric,
    (p_order_data->>'subtotal')::numeric,
    (p_order_data->>'delivery_fee')::numeric,
    COALESCE((p_order_data->>'adjustments')::numeric, 0),
    COALESCE((p_order_data->>'status')::order_status, 'preparing'::order_status),
    COALESCE(p_order_data->>'payment_status', 'pending'),
    p_order_data->>'payment_method',
    (p_order_data->>'customer_id')::uuid,
    (p_order_data->>'delivery_date')::date,
    (p_order_data->>'delivery_time')::time,
    COALESCE((p_order_data->>'delivery_method')::delivery_method, 'delivery'::delivery_method),
    (p_order_data->>'truck_type')::truck_type,
    (p_order_data->>'truck_id')::uuid,
    (p_order_data->>'driver_id')::uuid,
    p_order_data->>'special_instructions',
    p_order_data->>'order_notes',
    p_order_data->>'delivery_notes',
    auth.uid()
  ) RETURNING id INTO new_order_id;

  RETURN new_order_id;
END;
$function$;