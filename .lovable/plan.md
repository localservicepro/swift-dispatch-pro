

## Add Account Number field to all customers

### Overview
Add an `account_number` column to the `customers` table that serves as a unique customer ID/reference number. This will be useful for storefront integration and general customer identification.

### Database Migration
Add `account_number` column to `customers` table with auto-generation:

```sql
ALTER TABLE public.customers 
ADD COLUMN account_number text UNIQUE;

-- Auto-generate account numbers for existing customers
UPDATE public.customers 
SET account_number = 'ACC-' || LPAD(
  (ROW_NUMBER() OVER (ORDER BY created_at))::text, 5, '0'
)
WHERE account_number IS NULL;

-- Create a function to auto-generate account numbers on insert
CREATE OR REPLACE FUNCTION generate_customer_account_number()
RETURNS trigger AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(account_number, 'ACC-', '') AS integer)
  ), 0) + 1 INTO next_num FROM public.customers 
  WHERE account_number LIKE 'ACC-%';
  
  NEW.account_number := 'ACC-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_account_number
BEFORE INSERT ON public.customers
FOR EACH ROW
WHEN (NEW.account_number IS NULL)
EXECUTE FUNCTION generate_customer_account_number();
```

### UI Changes

**1. CustomerCompanyForm.tsx** — Add read-only Account Number field at top (visible in edit mode, shows "Auto-generated" placeholder for new customers)

**2. CustomerCard.tsx** — Display account number in the customer info section (e.g. "ACC-00001" next to customer name or as a badge)

**3. CustomerDialog.tsx / useCustomerDialogData.ts** — Pass `account_number` through form data

**4. CustomerList.tsx** — Include account number in search/display if applicable

### Files to modify
- **Migration**: New column + trigger for auto-generation
- `src/components/customer/CustomerCompanyForm.tsx` — show account number field
- `src/components/customer/CustomerCard.tsx` — display account number
- `src/hooks/useCustomerDialogData.ts` — include account_number in form data

