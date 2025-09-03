-- Create order_returns table for tracking product returns
CREATE TABLE public.order_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  returned_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  return_reason TEXT,
  return_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'completed')),
  total_items_returned INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all returns" 
ON public.order_returns 
FOR ALL 
USING (is_current_user_admin());

CREATE POLICY "Users can view returns for their orders" 
ON public.order_returns 
FOR SELECT 
USING (
  order_id IN (
    SELECT o.id FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    WHERE c.auth_user_id = auth.uid()
  )
);

-- Create function to process returns and update inventory
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

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_order_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_order_returns_updated_at
BEFORE UPDATE ON public.order_returns
FOR EACH ROW
EXECUTE FUNCTION public.update_order_returns_updated_at();