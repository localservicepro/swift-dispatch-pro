-- Add contact selection support to orders table
ALTER TABLE public.orders 
ADD COLUMN contact_id UUID,
ADD COLUMN contact_name TEXT,
ADD COLUMN contact_email TEXT,
ADD COLUMN contact_phone TEXT;

-- Add foreign key relationship to customer_contacts
ALTER TABLE public.orders 
ADD CONSTRAINT orders_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES public.customer_contacts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON public.orders(contact_id);

-- Update existing orders to use primary contact where available
UPDATE public.orders 
SET 
  contact_id = pc.id,
  contact_name = pc.first_name || ' ' || pc.last_name,
  contact_email = pc.email,
  contact_phone = pc.phone
FROM public.customer_contacts pc
WHERE orders.customer_id = pc.customer_id 
  AND pc.is_primary_contact = true 
  AND orders.contact_id IS NULL;