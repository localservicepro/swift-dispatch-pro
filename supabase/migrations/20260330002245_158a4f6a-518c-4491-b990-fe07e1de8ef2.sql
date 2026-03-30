
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_contact_or_company_check;

ALTER TABLE public.customers ADD CONSTRAINT customers_contact_or_company_check
  CHECK (
    (entity_type = 'business' AND company_name IS NOT NULL AND trim(company_name) <> '')
    OR
    (COALESCE(entity_type, 'individual') <> 'business' AND first_name IS NOT NULL AND trim(first_name) <> '')
    OR
    (entity_type IS NULL AND first_name IS NOT NULL AND trim(first_name) <> '')
  );
