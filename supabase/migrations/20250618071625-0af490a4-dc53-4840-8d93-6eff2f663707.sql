
-- Add delivery_method enum type
CREATE TYPE delivery_method AS ENUM ('delivery', 'pickup');

-- Add delivery_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN delivery_method delivery_method DEFAULT 'delivery';

-- Make delivery-related fields more flexible for pickup orders
-- (truck_id, driver_id, and delivery_date/time can be null for pickup orders)
-- These fields are already nullable, so no changes needed there

-- Add index for better query performance
CREATE INDEX idx_orders_delivery_method ON public.orders(delivery_method);
