-- Add validation to prevent over-returns in the process_return function
CREATE OR REPLACE FUNCTION public.process_return(return_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  return_record order_returns%ROWTYPE;
  order_record orders%ROWTYPE;
  item jsonb;
  product_id_val uuid;
  quantity_val numeric;
  total_return_value numeric := 0;
  item_value numeric;
  existing_returned_qty numeric;
  original_qty numeric;
BEGIN
  -- Get return details
  SELECT * INTO return_record FROM order_returns WHERE id = return_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return % not found', return_id_param;
  END IF;
  
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = return_record.order_id;
  
  -- Process each returned item and validate quantities
  FOR item IN SELECT * FROM jsonb_array_elements(return_record.returned_items)
  LOOP
    product_id_val := (item->>'product_id')::uuid;
    quantity_val := (item->>'quantity_returned')::numeric;
    item_value := (item->>'unit_price')::numeric * quantity_val;
    
    -- Get original quantity from order
    SELECT COALESCE((product_item->>'quantity')::numeric, 1) INTO original_qty
    FROM jsonb_array_elements(order_record.products) as product_item
    WHERE (product_item->>'id')::uuid = product_id_val;
    
    -- Calculate total already returned quantity for this product
    SELECT COALESCE(SUM((returned_item->>'quantity_returned')::numeric), 0) INTO existing_returned_qty
    FROM order_returns or_rec
    CROSS JOIN jsonb_array_elements(or_rec.returned_items) as returned_item
    WHERE or_rec.order_id = return_record.order_id
      AND or_rec.id != return_id_param
      AND (returned_item->>'product_id')::uuid = product_id_val
      AND or_rec.status IN ('pending', 'processed');
    
    -- Validate that we're not returning more than originally ordered
    IF (existing_returned_qty + quantity_val) > original_qty THEN
      RAISE EXCEPTION 'Cannot return % units of product %. Only % units were originally ordered and % have already been returned.',
        quantity_val, item->>'product_name', original_qty, existing_returned_qty;
    END IF;
    
    total_return_value := total_return_value + item_value;
    
    -- Update stock quantity (restore to inventory)
    UPDATE products 
    SET 
      stock_quantity = stock_quantity + quantity_val,
      updated_at = now()
    WHERE id = product_id_val;
    
    -- Log the return processing
    PERFORM log_admin_activity(
      'product_return_processed',
      'product',
      product_id_val,
      jsonb_build_object(
        'return_id', return_id_param,
        'order_id', return_record.order_id,
        'quantity_returned', quantity_val,
        'product_name', item->>'product_name'
      ),
      NULL,
      NULL,
      format('Processed return of %s units for product %s from order %s', quantity_val, item->>'product_name', order_record.order_number)
    );
  END LOOP;
  
  -- Create customer credit for the return value
  IF total_return_value > 0 AND order_record.customer_id IS NOT NULL THEN
    PERFORM create_credit_from_return(
      return_id_param,
      order_record.customer_id,
      return_record.order_id,
      total_return_value,
      format('Credit from return #%s', return_id_param)
    );
  END IF;
  
  -- Update return status
  UPDATE order_returns 
  SET 
    status = 'processed',
    processed_at = now(),
    processed_by = auth.uid(),
    updated_at = now()
  WHERE id = return_id_param;
END;
$function$;