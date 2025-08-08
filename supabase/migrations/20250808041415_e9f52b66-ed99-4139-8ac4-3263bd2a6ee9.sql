-- Add gst_enabled field to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN gst_enabled boolean NOT NULL DEFAULT true;