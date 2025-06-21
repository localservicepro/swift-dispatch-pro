
-- Add admin_email column to email_settings table
ALTER TABLE public.email_settings 
ADD COLUMN admin_email TEXT;

-- Update the column to have a default value for existing records
UPDATE public.email_settings 
SET admin_email = 'admin@localservicepro.com.au' 
WHERE admin_email IS NULL;
