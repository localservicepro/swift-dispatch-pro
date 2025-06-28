
-- Add company and business fields to customers table
ALTER TABLE public.customers 
ADD COLUMN company_name TEXT,
ADD COLUMN business_name TEXT,
ADD COLUMN contact_role TEXT DEFAULT 'Primary Contact';

-- Create customer_contacts table for associated people
CREATE TABLE public.customer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_role TEXT DEFAULT 'Contact',
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_primary_contact_per_customer UNIQUE (customer_id, is_primary_contact) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS on customer_contacts
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_contacts
CREATE POLICY "Admins can manage customer contacts" ON public.customer_contacts FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add indexes for better performance
CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_primary ON public.customer_contacts(customer_id, is_primary_contact) WHERE is_primary_contact = true;

-- Update existing customers to have their current name as company name for account customers
UPDATE public.customers 
SET company_name = first_name || ' ' || last_name || ' Business',
    contact_role = 'Primary Contact'
WHERE customer_type = 'account';

-- For trade customers, keep as individual (no company name needed)
UPDATE public.customers 
SET contact_role = 'Owner'
WHERE customer_type = 'trade';
