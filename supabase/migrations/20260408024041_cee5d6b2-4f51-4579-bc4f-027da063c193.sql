
-- Add account_number column
ALTER TABLE public.customers 
ADD COLUMN account_number text UNIQUE;

-- Backfill existing customers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.customers
  WHERE account_number IS NULL
)
UPDATE public.customers c
SET account_number = 'ACC-' || LPAD(numbered.rn::text, 5, '0')
FROM numbered
WHERE c.id = numbered.id;

-- Create auto-generation function
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
    CAST(REPLACE(account_number, 'ACC-', '') AS integer)
  ), 0) + 1 INTO next_num 
  FROM public.customers 
  WHERE account_number LIKE 'ACC-%';
  
  NEW.account_number := 'ACC-' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_customer_account_number
BEFORE INSERT ON public.customers
FOR EACH ROW
WHEN (NEW.account_number IS NULL)
EXECUTE FUNCTION public.generate_customer_account_number();
