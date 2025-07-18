-- Drop the problematic unique constraint that prevents multiple non-primary contacts
ALTER TABLE public.customer_contacts 
DROP CONSTRAINT IF EXISTS unique_primary_contact_per_customer;

-- Create a partial unique index that only enforces uniqueness when is_primary_contact = true
-- This allows multiple non-primary contacts per customer while ensuring only one primary contact
CREATE UNIQUE INDEX idx_customer_contacts_single_primary 
ON public.customer_contacts(customer_id) 
WHERE is_primary_contact = true;

-- Update the default contact role to match what's expected in the code
ALTER TABLE public.customer_contacts 
ALTER COLUMN contact_role SET DEFAULT 'Contact';