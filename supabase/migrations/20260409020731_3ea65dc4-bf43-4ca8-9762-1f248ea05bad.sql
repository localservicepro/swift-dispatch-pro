
-- Update existing account numbers to remove ACC- prefix
UPDATE public.customers 
SET account_number = REPLACE(account_number, 'ACC-', '')
WHERE account_number LIKE 'ACC-%';

-- Update the auto-generation function to not use ACC- prefix
CREATE OR REPLACE FUNCTION public.generate_customer_account_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.account_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    CAST(account_number AS integer)
  ), 0) + 1 INTO next_num 
  FROM public.customers 
  WHERE account_number ~ '^\d+$';
  
  NEW.account_number := LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;
