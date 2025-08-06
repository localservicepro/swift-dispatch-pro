-- Fix the final remaining database functions to have proper search_path

CREATE OR REPLACE FUNCTION public.update_payment_status(p_order_id uuid, p_new_status text, p_payment_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
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

CREATE OR REPLACE FUNCTION public.soft_delete_split_order_group(p_order_id uuid, p_reason text DEFAULT 'Admin group deletion'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  master_order_id uuid;
  deleted_order_ids uuid[];
  order_numbers text[];
  customer_name text;
  result jsonb;
BEGIN
  -- First, determine if this is a master order or split order
  SELECT 
    CASE 
      WHEN master_order_id IS NULL THEN id
      ELSE master_order_id
    END,
    customer_name
  INTO master_order_id, customer_name
  FROM public.orders 
  WHERE id = p_order_id AND deleted_at IS NULL;
  
  IF master_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or already deleted';
  END IF;
  
  -- Get all orders in the group (master + splits)
  SELECT 
    array_agg(id),
    array_agg(order_number)
  INTO deleted_order_ids, order_numbers
  FROM public.orders
  WHERE (id = master_order_id OR master_order_id = master_order_id)
    AND deleted_at IS NULL;
  
  -- Soft delete all orders in the group
  UPDATE public.orders 
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    updated_at = now()
  WHERE id = ANY(deleted_order_ids);
  
  -- Return summary
  result := jsonb_build_object(
    'deleted_order_ids', to_jsonb(deleted_order_ids),
    'order_numbers', to_jsonb(order_numbers),
    'customer_name', customer_name,
    'total_deleted', array_length(deleted_order_ids, 1)
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_split_order_group(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  master_order_id uuid;
  restored_order_ids uuid[];
  order_numbers text[];
  customer_name text;
  result jsonb;
BEGIN
  -- First, determine if this is a master order or split order
  SELECT 
    CASE 
      WHEN master_order_id IS NULL THEN id
      ELSE master_order_id
    END,
    customer_name
  INTO master_order_id, customer_name
  FROM public.orders 
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  
  IF master_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not deleted';
  END IF;
  
  -- Get all orders in the group (master + splits)
  SELECT 
    array_agg(id),
    array_agg(order_number)
  INTO restored_order_ids, order_numbers
  FROM public.orders
  WHERE (id = master_order_id OR master_order_id = master_order_id)
    AND deleted_at IS NOT NULL;
  
  -- Restore all orders in the group
  UPDATE public.orders 
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = ANY(restored_order_ids);
  
  -- Return summary
  result := jsonb_build_object(
    'restored_order_ids', to_jsonb(restored_order_ids),
    'order_numbers', to_jsonb(order_numbers),
    'customer_name', customer_name,
    'total_restored', array_length(restored_order_ids, 1)
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.format_products_text(products_json jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  formatted_text TEXT := '';
  product_item jsonb;
  product_name TEXT;
  product_price NUMERIC;
  product_quantity NUMERIC;
  item_text TEXT;
BEGIN
  -- Handle null or empty products
  IF products_json IS NULL OR jsonb_array_length(products_json) = 0 THEN
    RETURN 'No products';
  END IF;
  
  -- Loop through each product in the JSONB array
  FOR product_item IN SELECT * FROM jsonb_array_elements(products_json)
  LOOP
    -- Extract product details with fallback names
    product_name := COALESCE(product_item->>'name', product_item->>'product_name', 'Product');
    product_price := COALESCE((product_item->>'price')::numeric, (product_item->>'unit_price')::numeric, 0);
    product_quantity := COALESCE((product_item->>'quantity')::numeric, 1);
    
    -- Format individual product text
    item_text := product_name || ' $' || product_price::text || ' (Qty: ' || product_quantity::text || ')';
    
    -- Add to formatted text with comma separator
    IF formatted_text = '' THEN
      formatted_text := item_text;
    ELSE
      formatted_text := formatted_text || ', ' || item_text;
    END IF;
  END LOOP;
  
  RETURN formatted_text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_products_formatted()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.products_formatted := format_products_text(NEW.products);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.populate_order_driver_truck_info()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  driver_full_name TEXT;
  truck_reg TEXT;
  truck_display TEXT;
BEGIN
  -- Get driver name if driver_id is provided
  IF NEW.driver_id IS NOT NULL THEN
    SELECT full_name INTO driver_full_name
    FROM public.profiles
    WHERE id = NEW.driver_id;
    
    NEW.driver_name := COALESCE(driver_full_name, 'Unknown Driver');
  ELSE
    NEW.driver_name := NULL;
  END IF;

  -- Get truck info if truck_id is provided
  IF NEW.truck_id IS NOT NULL THEN
    SELECT registration_number INTO truck_reg
    FROM public.trucks
    WHERE id = NEW.truck_id;
    
    NEW.truck_registration := truck_reg;
  ELSE
    NEW.truck_registration := NULL;
  END IF;

  -- Get truck type display
  IF NEW.truck_type IS NOT NULL THEN
    NEW.truck_type_display := get_truck_display_info(NEW.truck_type);
  ELSE
    NEW.truck_type_display := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_truck_display_info(truck_type_param truck_type)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  CASE truck_type_param
    WHEN 'small' THEN RETURN 'Small Truck';
    WHEN 'medium' THEN RETURN 'Medium Truck';
    WHEN 'large' THEN RETURN 'Large Truck';
    WHEN 'crane' THEN RETURN 'Crane Truck';
    ELSE RETURN 'Unknown Truck';
  END CASE;
END;
$function$;