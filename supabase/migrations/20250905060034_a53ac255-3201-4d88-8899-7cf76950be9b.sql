-- 1) Generate non-sequential unique order numbers like ORD-175704
-- Update generator to return full prefixed value and ensure uniqueness
CREATE OR REPLACE FUNCTION public.generate_short_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  suffix text;
  candidate text;
BEGIN
  LOOP
    -- Generate a random 6-digit number (000000 - 999999) and pad with zeros
    suffix := lpad((floor(random() * 1000000))::int::text, 6, '0');
    candidate := 'ORD-' || suffix;

    -- Ensure it doesn't exist already
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.orders WHERE order_number = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$;

-- 2) Update BEFORE INSERT trigger function to enforce the new format
CREATE OR REPLACE FUNCTION public.set_short_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If order_number is missing or not matching the required format, generate one
  IF NEW.order_number IS NULL
     OR NEW.order_number !~ '^ORD-[0-9]{6}$'
  THEN
    NEW.order_number := public.generate_short_order_number();
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Ensure trigger exists on orders table
DROP TRIGGER IF EXISTS set_short_order_number_trigger ON public.orders;
CREATE TRIGGER set_short_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_short_order_number();

-- 4) Enforce uniqueness for new formatted numbers (without breaking legacy data)
CREATE UNIQUE INDEX IF NOT EXISTS unique_orders_ord_prefix_number
ON public.orders (order_number)
WHERE order_number ~ '^ORD-[0-9]{6}$';

-- 5) Update create_single_order to rely on trigger for order_number
CREATE OR REPLACE FUNCTION public.create_single_order(p_order_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_order_id uuid;
BEGIN
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
    NULL, -- Let trigger set 'ORD-XXXXXX'
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
$$;