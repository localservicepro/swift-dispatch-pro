
-- Add fields to orders table to support order splitting
ALTER TABLE public.orders 
ADD COLUMN is_split_order BOOLEAN DEFAULT FALSE,
ADD COLUMN master_order_id UUID REFERENCES public.orders(id),
ADD COLUMN split_number INTEGER DEFAULT NULL;

-- Add index for better performance on split order queries
CREATE INDEX idx_orders_master_order_id ON public.orders(master_order_id);
CREATE INDEX idx_orders_split_order ON public.orders(is_split_order, master_order_id);

-- Add constraint to ensure split_number is only set for split orders
ALTER TABLE public.orders 
ADD CONSTRAINT check_split_number_consistency 
CHECK (
  (is_split_order = FALSE AND split_number IS NULL) OR 
  (is_split_order = TRUE AND split_number IS NOT NULL AND split_number > 0)
);
