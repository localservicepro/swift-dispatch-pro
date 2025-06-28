
-- Step 1: Create customer_type enum first
CREATE TYPE public.customer_type AS ENUM ('trade', 'account', 'residential');

-- Step 2: Create entity_type enum
CREATE TYPE public.entity_type AS ENUM ('individual', 'business');

-- Step 3: Add entity_type column to customers table
ALTER TABLE public.customers 
ADD COLUMN entity_type public.entity_type DEFAULT 'individual';

-- Step 4: Add business_details column
ALTER TABLE public.customers 
ADD COLUMN business_details JSONB DEFAULT '{}';

-- Step 5: Update existing customer_type column to use the new enum
-- First add a temporary column with the enum type
ALTER TABLE public.customers 
ADD COLUMN customer_type_new public.customer_type;

-- Migrate existing data to the new enum column
UPDATE public.customers 
SET customer_type_new = customer_type::public.customer_type
WHERE customer_type IN ('trade', 'account');

-- Set default for any null values
UPDATE public.customers 
SET customer_type_new = 'trade'
WHERE customer_type_new IS NULL;

-- Drop the old column and rename the new one
ALTER TABLE public.customers 
DROP COLUMN customer_type;

ALTER TABLE public.customers 
RENAME COLUMN customer_type_new TO customer_type;

-- Make the column NOT NULL
ALTER TABLE public.customers 
ALTER COLUMN customer_type SET NOT NULL;

-- Step 6: Create individual pricing tier
INSERT INTO public.pricing_tiers (
  name, 
  display_name, 
  description, 
  percentage_adjustment, 
  is_markup, 
  is_default, 
  is_active
) VALUES (
  'individual', 
  'Individual', 
  'Standard pricing for residential customers', 
  0, 
  false, 
  false, 
  true
);

-- Step 7: Migrate existing data intelligently
-- Set entity_type to 'business' for customers with company_name
UPDATE public.customers 
SET entity_type = 'business'
WHERE company_name IS NOT NULL AND company_name != '';

-- Step 8: Create a view for easier customer classification queries
CREATE OR REPLACE VIEW public.customer_classification AS
SELECT 
  c.*,
  CASE 
    WHEN c.customer_type = 'residential' THEN 'Residential'
    WHEN c.customer_type = 'trade' THEN 'Trade'
    WHEN c.customer_type = 'account' THEN 'Account'
    ELSE c.customer_type::text
  END as customer_type_display,
  CASE 
    WHEN c.entity_type = 'individual' THEN 'Individual'
    WHEN c.entity_type = 'business' THEN 'Business'
    ELSE c.entity_type::text
  END as entity_type_display,
  -- Smart pricing tier suggestion based on customer and entity type
  CASE 
    WHEN c.customer_type = 'residential' THEN 'individual'
    WHEN c.customer_type = 'trade' THEN 'trade'
    WHEN c.customer_type = 'account' THEN 'account'
    ELSE 'individual'
  END as suggested_pricing_tier
FROM public.customers c;

-- Step 9: Add indexes for better performance
CREATE INDEX idx_customers_entity_type ON public.customers(entity_type);
CREATE INDEX idx_customers_customer_type_entity_type ON public.customers(customer_type, entity_type);
