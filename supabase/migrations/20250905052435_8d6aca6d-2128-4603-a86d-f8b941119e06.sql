
-- 1) Create a sequence for short numeric order numbers (6 digits)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 100000 INCREMENT BY 1;

-- 2) Function to generate a 6-digit unique order number
CREATE OR REPLACE FUNCTION public.generate_short_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num bigint;
  order_no text;
BEGIN
  LOOP
    next_num := nextval('public.order_number_seq');
    order_no := lpad(next_num::text, 6, '0');

    -- Ensure it doesn't exist already (belt and suspenders, unique index will also protect)
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.orders WHERE order_number = order_no
    );
  END LOOP;

  RETURN order_no;
END;
$function$;

-- 3) Unique index on order_number to guarantee uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique ON public.orders (order_number);

-- 4) BEFORE INSERT trigger to enforce 6-digit numbers for new rows
CREATE OR REPLACE FUNCTION public.set_short_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If order_number is NULL or not numeric / too long, replace with 6-digit generated number
  IF NEW.order_number IS NULL
     OR length(NEW.order_number) > 6
     OR NEW.order_number !~ '^[0-9]{1,6}$'
  THEN
    NEW.order_number := public.generate_short_order_number();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_short_order_number ON public.orders;
CREATE TRIGGER trg_set_short_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_short_order_number();

-- 5) Update create_single_order() to use short order numbers
CREATE OR REPLACE FUNCTION public.create_single_order(p_order_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
  order_number_val text;
BEGIN
  -- Use provided order_number if valid 1–6 digits, otherwise generate one
  IF (p_order_data ? 'order_number') AND (p_order_data->>'order_number') ~ '^[0-9]{1,6}$' THEN
    order_number_val := p_order_data->>'order_number';
  ELSE
    order_number_val := public.generate_short_order_number();
  END IF;

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

-- 6) Update create_stock_split_order() so the extra order gets a short number (no '-STOCK' suffix)
CREATE OR REPLACE FUNCTION public.create_stock_split_order(p_order_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    SELECT is_sufficient INTO stock_check
    FROM check_stock_availability(jsonb_build_array(product_item))
    LIMIT 1;

    IF stock_check THEN
      in_stock_products := in_stock_products || product_item;
      in_stock_total := in_stock_total + 
        COALESCE((product_item->>'price')::numeric, (product_item->>'unit_price')::numeric, 0) * 
        COALESCE((product_item->>'quantity')::numeric, 1);
    ELSE
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

  -- Update original order to be the in-stock order
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

  -- Create new order for out-of-stock items with a fresh short order number
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
    public.generate_short_order_number(), -- new short number
    original_order.purchase_order,
    original_order.customer_name,
    original_order.customer_phone,
    original_order.customer_address,
    original_order.delivery_address,
    out_of_stock_products,
    out_of_stock_total,
    out_of_stock_total,
    0,
    0,
    'back_order'::order_status,
    original_order.payment_status,
    original_order.payment_method,
    original_order.customer_id,
    original_order.delivery_date,
    original_order.delivery_time,
    original_order.delivery_method,
    original_order.truck_type,
    NULL,
    NULL,
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
           'short-number-generated')
  );

  RETURN result_order_ids;
END;
$function$;
