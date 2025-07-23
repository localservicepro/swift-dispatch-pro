
-- Extend delivery_method enum to include pickup_delivery
ALTER TYPE delivery_method ADD VALUE 'pickup_delivery';

-- Add pickup location fields to orders table
ALTER TABLE public.orders 
ADD COLUMN pickup_location_address text,
ADD COLUMN pickup_location_name text,
ADD COLUMN pickup_contact_name text,
ADD COLUMN pickup_contact_phone text,
ADD COLUMN pickup_instructions text,
ADD COLUMN pickup_date date,
ADD COLUMN pickup_time time without time zone;

-- Add new order statuses for pickup workflow
ALTER TYPE order_status ADD VALUE 'pickup_scheduled';
ALTER TYPE order_status ADD VALUE 'pickup_in_progress';
ALTER TYPE order_status ADD VALUE 'pickup_complete';
