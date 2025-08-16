-- Add hard delete functionality for orders and split order groups
-- These functions permanently remove orders and all related data

-- Function to hard delete a single order
CREATE OR REPLACE FUNCTION public.hard_delete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record orders%ROWTYPE;
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can permanently delete orders';
  END IF;
  
  -- Get order details and ensure it's already soft deleted
  SELECT * INTO order_record 
  FROM orders 
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not deleted. Only soft-deleted orders can be permanently deleted.';
  END IF;
  
  -- Delete related data in safe order
  DELETE FROM delivery_routes WHERE order_id = p_order_id;
  DELETE FROM delivery_status_updates WHERE order_id = p_order_id;
  DELETE FROM delivery_photos WHERE order_id = p_order_id;
  DELETE FROM order_items WHERE order_id = p_order_id;
  DELETE FROM invoices WHERE order_id = p_order_id;
  
  -- Delete the order itself
  DELETE FROM orders WHERE id = p_order_id;
  
  -- Log the activity
  PERFORM log_admin_activity(
    'hard_delete_order',
    'order',
    p_order_id,
    jsonb_build_object(
      'order_number', order_record.order_number,
      'customer_name', order_record.customer_name
    ),
    NULL,
    NULL,
    format('Permanently deleted order %s for customer %s', order_record.order_number, order_record.customer_name)
  );
END;
$function$;

-- Function to hard delete an entire split order group
CREATE OR REPLACE FUNCTION public.hard_delete_split_order_group(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  master_order_id uuid;
  order_ids uuid[];
  order_numbers text[];
  customer_name text;
  order_record record;
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can permanently delete order groups';
  END IF;
  
  -- Determine master order ID (works even for deleted orders)
  SELECT 
    CASE 
      WHEN master_order_id IS NULL THEN id
      ELSE master_order_id
    END,
    customer_name
  INTO master_order_id, customer_name
  FROM orders 
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  
  IF master_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or not deleted. Only soft-deleted orders can be permanently deleted.';
  END IF;
  
  -- Get all orders in the group that are deleted
  SELECT 
    array_agg(id),
    array_agg(order_number)
  INTO order_ids, order_numbers
  FROM orders
  WHERE (id = master_order_id OR master_order_id = master_order_id)
    AND deleted_at IS NOT NULL;
  
  IF array_length(order_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No deleted orders found in group';
  END IF;
  
  -- Delete related data for all orders in the group
  DELETE FROM delivery_routes WHERE order_id = ANY(order_ids);
  DELETE FROM delivery_status_updates WHERE order_id = ANY(order_ids);
  DELETE FROM delivery_photos WHERE order_id = ANY(order_ids);
  DELETE FROM order_items WHERE order_id = ANY(order_ids);
  DELETE FROM invoices WHERE order_id = ANY(order_ids);
  
  -- Delete all orders in the group
  DELETE FROM orders WHERE id = ANY(order_ids);
  
  -- Log the activity
  PERFORM log_admin_activity(
    'hard_delete_split_order_group',
    'order',
    master_order_id,
    jsonb_build_object(
      'deleted_order_ids', order_ids,
      'order_numbers', order_numbers,
      'customer_name', customer_name,
      'total_deleted', array_length(order_ids, 1)
    ),
    NULL,
    NULL,
    format('Permanently deleted split order group for %s: %s (%s orders)', 
           customer_name, 
           array_to_string(order_numbers, ', '),
           array_length(order_ids, 1))
  );
  
  -- Return summary
  result := jsonb_build_object(
    'deleted_order_ids', to_jsonb(order_ids),
    'order_numbers', to_jsonb(order_numbers),
    'customer_name', customer_name,
    'total_deleted', array_length(order_ids, 1)
  );
  
  RETURN result;
END;
$function$;