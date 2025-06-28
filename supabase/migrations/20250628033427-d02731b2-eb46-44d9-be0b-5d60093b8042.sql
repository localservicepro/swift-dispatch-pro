
-- Add purchase_order column to orders table
ALTER TABLE public.orders 
ADD COLUMN purchase_order text;

-- Add comment to document the field
COMMENT ON COLUMN public.orders.purchase_order IS 'Customer purchase order number for reference';
