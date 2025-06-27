
-- Add order_notes and delivery_notes columns to the orders table
ALTER TABLE public.orders 
ADD COLUMN order_notes TEXT,
ADD COLUMN delivery_notes TEXT;

-- Add comments to document the purpose of each field
COMMENT ON COLUMN public.orders.order_notes IS 'Notes visible to admin and customers, included on invoices';
COMMENT ON COLUMN public.orders.delivery_notes IS 'Notes visible only to assigned drivers for delivery instructions';
