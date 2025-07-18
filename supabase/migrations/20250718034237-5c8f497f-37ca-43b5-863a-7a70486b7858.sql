-- Fix order status enum references and create missing split order functions

-- First, let's create the missing soft_delete_split_order_group function
CREATE OR REPLACE FUNCTION public.soft_delete_split_order_group(
  p_order_id uuid,
  p_reason text DEFAULT 'Admin group deletion'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create the missing restore_split_order_group function
CREATE OR REPLACE FUNCTION public.restore_split_order_group(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;