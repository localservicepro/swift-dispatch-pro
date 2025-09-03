-- Create customer credits table for tracking credits from returns
CREATE TABLE public.customer_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  source_order_id UUID,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  created_from_return_id UUID,
  used_in_order_id UUID,
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for customer credits
CREATE POLICY "Admins can manage all customer credits"
ON public.customer_credits
FOR ALL
USING (is_current_user_admin());

CREATE POLICY "Customers can view their own credits"
ON public.customer_credits
FOR SELECT
USING (customer_id IN (
  SELECT id FROM customers WHERE auth_user_id = auth.uid()
));

-- Create function to create credit from return
CREATE OR REPLACE FUNCTION public.create_credit_from_return(
  return_id_param UUID,
  customer_id_param UUID,
  source_order_id_param UUID,
  amount_param NUMERIC,
  description_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  credit_id UUID;
BEGIN
  INSERT INTO public.customer_credits (
    customer_id,
    source_order_id,
    amount,
    created_from_return_id,
    description,
    expires_at
  ) VALUES (
    customer_id_param,
    source_order_id_param,
    amount_param,
    return_id_param,
    COALESCE(description_param, 'Credit from return'),
    now() + INTERVAL '1 year' -- Credits expire after 1 year
  ) RETURNING id INTO credit_id;
  
  RETURN credit_id;
END;
$$;

-- Create function to apply credit to order
CREATE OR REPLACE FUNCTION public.apply_credit_to_order(
  credit_id_param UUID,
  order_id_param UUID,
  amount_used_param NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  credit_record customer_credits%ROWTYPE;
  remaining_amount NUMERIC;
BEGIN
  -- Get credit details
  SELECT * INTO credit_record FROM customer_credits WHERE id = credit_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit not found';
  END IF;
  
  IF credit_record.status != 'available' THEN
    RAISE EXCEPTION 'Credit is not available';
  END IF;
  
  IF amount_used_param > credit_record.amount THEN
    RAISE EXCEPTION 'Cannot use more than available credit amount';
  END IF;
  
  -- Calculate remaining amount
  remaining_amount := credit_record.amount - amount_used_param;
  
  -- If using full amount, mark as used
  IF remaining_amount = 0 THEN
    UPDATE customer_credits 
    SET 
      status = 'used',
      used_in_order_id = order_id_param,
      updated_at = now()
    WHERE id = credit_id_param;
  ELSE
    -- If partial use, create new credit for remaining amount and mark original as used
    UPDATE customer_credits 
    SET 
      amount = amount_used_param,
      status = 'used',
      used_in_order_id = order_id_param,
      updated_at = now()
    WHERE id = credit_id_param;
    
    -- Create new credit for remaining amount
    INSERT INTO customer_credits (
      customer_id,
      source_order_id,
      amount,
      created_from_return_id,
      description,
      expires_at
    ) VALUES (
      credit_record.customer_id,
      credit_record.source_order_id,
      remaining_amount,
      credit_record.created_from_return_id,
      'Remaining credit from partial use',
      credit_record.expires_at
    );
  END IF;
END;
$$;

-- Update the process_return function to create credits
CREATE OR REPLACE FUNCTION public.process_return(return_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  return_record order_returns%ROWTYPE;
  order_record orders%ROWTYPE;
  item jsonb;
  product_id_val uuid;
  quantity_val numeric;
  total_return_value numeric := 0;
  item_value numeric;
BEGIN
  -- Get return details
  SELECT * INTO return_record FROM order_returns WHERE id = return_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return % not found', return_id_param;
  END IF;
  
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = return_record.order_id;
  
  -- Process each returned item
  FOR item IN SELECT * FROM jsonb_array_elements(return_record.returned_items)
  LOOP
    product_id_val := (item->>'product_id')::uuid;
    quantity_val := (item->>'quantity_returned')::numeric;
    item_value := (item->>'unit_price')::numeric * quantity_val;
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
$$;