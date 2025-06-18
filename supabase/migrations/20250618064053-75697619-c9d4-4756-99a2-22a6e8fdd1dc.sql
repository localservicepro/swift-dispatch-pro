
-- Add delivery address fields to orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_address text,
ADD COLUMN same_as_billing boolean DEFAULT true;

-- Update existing orders to have delivery address same as customer address
UPDATE public.orders 
SET delivery_address = customer_address,
    same_as_billing = true
WHERE delivery_address IS NULL;

-- Make delivery_address not null after populating existing data
ALTER TABLE public.orders 
ALTER COLUMN delivery_address SET NOT NULL;
