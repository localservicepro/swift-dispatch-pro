
-- Create RPC functions to handle order operations with proper permissions

-- Function to update payment status
CREATE OR REPLACE FUNCTION public.update_payment_status(
  p_order_id uuid,
  p_new_status text,
  p_payment_date timestamp with time zone DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update the payment status
  UPDATE public.orders 
  SET 
    payment_status = p_new_status,
    payment_date = CASE 
      WHEN p_new_status = 'paid' THEN COALESCE(p_payment_date, now())
      ELSE payment_date 
    END,
    updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found', p_order_id;
  END IF;
END;
$function$;

-- Function to create a single order
CREATE OR REPLACE FUNCTION public.create_single_order(
  p_order_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to create split orders
CREATE OR REPLACE FUNCTION public.create_split_order(
  p_master_order_data jsonb,
  p_split_orders jsonb[]
)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  master_order_id uuid;
  split_order_ids uuid[] := '{}';
  split_order jsonb;
  split_order_id uuid;
  split_number int := 1;
BEGIN
  -- Create master order
  master_order_id := public.create_single_order(
    p_master_order_data || jsonb_build_object('is_split_order', true)
  );

  -- Create split orders
  FOREACH split_order IN ARRAY p_split_orders
  LOOP
    split_order_id := public.create_single_order(
      split_order || jsonb_build_object(
        'is_split_order', true,
        'master_order_id', master_order_id,
        'split_number', split_number
      )
    );
    
    split_order_ids := array_append(split_order_ids, split_order_id);
    split_number := split_number + 1;
  END LOOP;

  -- Return all order IDs (master + splits)
  RETURN array_prepend(master_order_id, split_order_ids);
END;
$function$;
