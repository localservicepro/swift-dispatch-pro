
-- Update existing contact roles to standardize to 'Associated Contact'
UPDATE public.customer_contacts 
SET contact_role = 'Associated Contact'
WHERE contact_role IN ('Vic', 'VIC', 'Contact', 'contact') 
   OR contact_role IS NULL;

-- Update the default value for future contact_role entries
ALTER TABLE public.customer_contacts 
ALTER COLUMN contact_role SET DEFAULT 'Associated Contact';
