
-- Add delivery_suburb_id to orders table to store the specific suburb for delivery address
ALTER TABLE public.orders 
ADD COLUMN delivery_suburb_id UUID REFERENCES public.suburbs(id);

-- Add index for better query performance
CREATE INDEX idx_orders_delivery_suburb_id ON public.orders(delivery_suburb_id);

-- Update existing orders to try to match delivery addresses with suburbs based on postcode
-- This is a best-effort migration for existing data
UPDATE public.orders 
SET delivery_suburb_id = suburbs.id
FROM public.suburbs
WHERE public.orders.delivery_suburb_id IS NULL
  AND public.orders.customer_address IS NOT NULL
  AND public.orders.customer_address ILIKE '%' || suburbs.postcode || '%'
  AND suburbs.is_active = true;

-- Add comment to document the new column
COMMENT ON COLUMN public.orders.delivery_suburb_id IS 'References the specific suburb for the delivery address, separate from customer''s registered suburb';
