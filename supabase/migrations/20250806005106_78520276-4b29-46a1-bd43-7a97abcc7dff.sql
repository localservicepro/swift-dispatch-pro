-- Fix remaining database functions to have proper search_path

CREATE OR REPLACE FUNCTION public.restore_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.orders 
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not deleted';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_manage_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Deduct inventory when order moves to preparing, loading, or en_route
  IF (OLD.status != NEW.status) AND 
     (NEW.status IN ('preparing', 'loading', 'en_route')) AND
     (OLD.status NOT IN ('preparing', 'loading', 'en_route', 'delivered')) THEN
    
    PERFORM deduct_inventory(NEW.id);
    
  -- Restore inventory when order is cancelled or deleted
  ELSIF (OLD.status != NEW.status) AND 
        (NEW.status = 'cancelled') AND
        (OLD.status IN ('preparing', 'loading', 'en_route')) THEN
    
    PERFORM restore_inventory(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_inventory(order_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  order_record orders%ROWTYPE;
  item jsonb;
  product_id_val uuid;
  quantity_val numeric;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', order_id_param;
  END IF;
  
  -- Process each product in the order
  FOR item IN SELECT * FROM jsonb_array_elements(order_record.products)
  LOOP
    product_id_val := (item->>'id')::uuid;
    quantity_val := (item->>'quantity')::numeric;
    
    -- Update stock quantity
    UPDATE products 
    SET 
      stock_quantity = stock_quantity - quantity_val,
      updated_at = now()
    WHERE id = product_id_val;
    
    -- Log the inventory deduction
    PERFORM log_admin_activity(
      'inventory_deduction',
      'product',
      product_id_val,
      jsonb_build_object(
        'order_id', order_id_param,
        'quantity_deducted', quantity_val,
        'product_name', item->>'name'
      ),
      NULL,
      NULL,
      format('Deducted %s units from product %s for order %s', quantity_val, item->>'name', order_record.order_number)
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_inventory(order_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  order_record orders%ROWTYPE;
  item jsonb;
  product_id_val uuid;
  quantity_val numeric;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', order_id_param;
  END IF;
  
  -- Process each product in the order
  FOR item IN SELECT * FROM jsonb_array_elements(order_record.products)
  LOOP
    product_id_val := (item->>'id')::uuid;
    quantity_val := (item->>'quantity')::numeric;
    
    -- Restore stock quantity
    UPDATE products 
    SET 
      stock_quantity = stock_quantity + quantity_val,
      updated_at = now()
    WHERE id = product_id_val;
    
    -- Log the inventory restoration
    PERFORM log_admin_activity(
      'inventory_restoration',
      'product',
      product_id_val,
      jsonb_build_object(
        'order_id', order_id_param,
        'quantity_restored', quantity_val,
        'product_name', item->>'name'
      ),
      NULL,
      NULL,
      format('Restored %s units to product %s from cancelled order %s', quantity_val, item->>'name', order_record.order_number)
    );
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.determine_order_status(order_items jsonb)
 RETURNS order_status
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  has_insufficient_stock boolean := false;
  stock_check record;
BEGIN
  -- Check if any items have insufficient stock
  FOR stock_check IN 
    SELECT is_sufficient FROM check_stock_availability(order_items)
  LOOP
    IF NOT stock_check.is_sufficient THEN
      has_insufficient_stock := true;
      EXIT;
    END IF;
  END LOOP;
  
  -- Return appropriate status
  IF has_insufficient_stock THEN
    RETURN 'back_order'::order_status;
  ELSE
    RETURN 'requested'::order_status;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_low_stock_products(threshold numeric DEFAULT 10)
 RETURNS TABLE(product_id uuid, product_name text, current_stock numeric, category_name text)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.stock_quantity,
    COALESCE(pc.name, 'Uncategorized') as category
  FROM products p
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.is_active = true 
    AND p.stock_quantity <= threshold
  ORDER BY p.stock_quantity ASC, p.name ASC;
END;
$function$;