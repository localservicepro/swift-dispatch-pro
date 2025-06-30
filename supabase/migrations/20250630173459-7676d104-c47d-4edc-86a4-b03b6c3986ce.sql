
-- Make contact person fields nullable for Account Business entities
ALTER TABLE public.customers 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL;

-- Add a check to ensure that either contact details are provided OR it's a business entity with company_name
-- This ensures data integrity while allowing flexibility for business accounts
ALTER TABLE public.customers 
ADD CONSTRAINT customers_contact_or_company_check 
CHECK (
  (first_name IS NOT NULL AND last_name IS NOT NULL AND email IS NOT NULL) OR 
  (entity_type = 'business' AND company_name IS NOT NULL)
);
