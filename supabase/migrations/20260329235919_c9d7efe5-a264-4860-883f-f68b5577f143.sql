
-- Step 1: For residential/trade customers that have valid first_name AND last_name AND email,
-- safely clean junk company_name and business_name, then fix entity_type
UPDATE customers
SET 
  company_name = CASE WHEN trim(company_name) ~ '^[*.\-_\s]+$' THEN NULL ELSE company_name END,
  business_name = CASE WHEN trim(COALESCE(business_name, '')) ~ '^[*.\-_\s]+$' THEN NULL ELSE business_name END,
  entity_type = 'individual'
WHERE customer_type IN ('residential', 'trade')
  AND first_name IS NOT NULL AND trim(first_name) != '' AND NOT (trim(first_name) ~ '^[*.\-_\s]+$')
  AND last_name IS NOT NULL AND trim(last_name) != '' AND NOT (trim(last_name) ~ '^[*.\-_\s]+$')
  AND email IS NOT NULL AND trim(email) != ''
  AND (
    (company_name IS NOT NULL AND trim(company_name) ~ '^[*.\-_\s]+$')
    OR (business_name IS NOT NULL AND trim(business_name) ~ '^[*.\-_\s]+$')
    OR entity_type = 'business'
  );

-- Step 2: For customers where first_name is junk but they have valid company info,
-- just clean first_name (constraint still satisfied via business path)
UPDATE customers
SET first_name = NULL
WHERE first_name IS NOT NULL
  AND trim(first_name) ~ '^[*.\-_\s]+$'
  AND entity_type = 'business'
  AND company_name IS NOT NULL
  AND NOT (trim(company_name) ~ '^[*.\-_\s]+$');

-- Step 3: Clean junk business_name for any remaining records (business_name isn't part of constraint)
UPDATE customers
SET business_name = NULL
WHERE business_name IS NOT NULL
  AND trim(business_name) ~ '^[*.\-_\s]+$';
