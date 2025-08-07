-- Make full_address nullable in customers table to allow creating customers without addresses
ALTER TABLE public.customers 
ALTER COLUMN full_address DROP NOT NULL;