-- Phase 1: Database Enhancements for Inventory Management

-- Create function to check stock availability for order items
CREATE OR REPLACE FUNCTION public.check_stock_availability(order_items jsonb)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  requested_quantity numeric,
  available_stock numeric,
  is_sufficient boolean
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'id')::uuid as product_id,
    p.name as product_name,
    (item->>'quantity')::numeric as requested_quantity,
    p.stock_quantity as available_stock,
    (p.stock_quantity >= (item->>'quantity')::numeric) as is_sufficient
  FROM jsonb_array_elements(order_items) as item
  JOIN products p ON p.id = (item->>'id')::uuid
  WHERE p.is_active = true;
END;
$$;

-- Create function to deduct stock when order is confirmed
CREATE OR REPLACE FUNCTION public.deduct_inventory(order_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- Create function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_inventory(order_id_param uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- Create function to determine if order should be back order
CREATE OR REPLACE FUNCTION public.determine_order_status(order_items jsonb)
RETURNS order_status LANGUAGE plpgsql AS $$
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
$$;

-- Create trigger function to auto-deduct inventory on order status change
CREATE OR REPLACE FUNCTION public.auto_manage_inventory()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Deduct inventory when order moves to confirmed, in_production, or shipped
  IF (OLD.status != NEW.status) AND 
     (NEW.status IN ('confirmed', 'in_production', 'shipped')) AND
     (OLD.status NOT IN ('confirmed', 'in_production', 'shipped', 'delivered')) THEN
    
    PERFORM deduct_inventory(NEW.id);
    
  -- Restore inventory when order is cancelled or deleted
  ELSIF (OLD.status != NEW.status) AND 
        (NEW.status = 'cancelled') AND
        (OLD.status IN ('confirmed', 'in_production', 'shipped')) THEN
    
    PERFORM restore_inventory(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_manage_inventory ON orders;
CREATE TRIGGER trigger_auto_manage_inventory
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_manage_inventory();

-- Create function to get low stock products
CREATE OR REPLACE FUNCTION public.get_low_stock_products(threshold numeric DEFAULT 10)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  current_stock numeric,
  category_name text
) LANGUAGE plpgsql AS $$
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
$$;

-- Create function to get back order summary
CREATE OR REPLACE FUNCTION public.get_back_order_summary()
RETURNS TABLE(
  product_id uuid,
  product_name text,
  total_back_ordered numeric,
  current_stock numeric,
  orders_count bigint
) LANGUAGE plpgsql AS $$
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
$$;