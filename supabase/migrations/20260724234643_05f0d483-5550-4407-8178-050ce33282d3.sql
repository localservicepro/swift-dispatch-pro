
-- 1) Add payment_type column (nullable initially so backfill can populate it)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_type text;

-- 2) Backfill payment_type + normalize legacy payment_method values on existing rows
--    Legacy -> (payment_type, payment_method)
--      cash            -> residential      / cash
--      cod             -> cod              / cash
--      card_on_file    -> card_on_file     / credit_card
--      invoice         -> 30_day_account   / pay_direct_debit
--      7_day_invoice   -> 7_day_account    / direct_debit
--      in_yard_cash    -> residential      / cash
--      in_yard_card    -> residential      / credit_card
--      account_cash    -> 30_day_account   / account_cash
--      account_card    -> 30_day_account   / pay_credit_card
--      (anything else) -> residential      / cash
UPDATE public.orders
SET
  payment_type = CASE payment_method
    WHEN 'cash'          THEN 'residential'
    WHEN 'cod'           THEN 'cod'
    WHEN 'card_on_file'  THEN 'card_on_file'
    WHEN 'invoice'       THEN '30_day_account'
    WHEN '7_day_invoice' THEN '7_day_account'
    WHEN 'in_yard_cash'  THEN 'residential'
    WHEN 'in_yard_card'  THEN 'residential'
    WHEN 'account_cash'  THEN '30_day_account'
    WHEN 'account_card'  THEN '30_day_account'
    ELSE 'residential'
  END,
  payment_method = CASE payment_method
    WHEN 'invoice'       THEN 'pay_direct_debit'
    WHEN '7_day_invoice' THEN 'direct_debit'
    WHEN 'in_yard_cash'  THEN 'cash'
    WHEN 'in_yard_card'  THEN 'credit_card'
    WHEN 'account_cash'  THEN 'account_cash'
    WHEN 'account_card'  THEN 'pay_credit_card'
    WHEN 'card_on_file'  THEN 'credit_card'
    WHEN 'cod'           THEN 'cash'
    WHEN 'cash'          THEN 'cash'
    ELSE COALESCE(payment_method, 'cash')
  END
WHERE payment_type IS NULL;

-- 3) Validation trigger: enforce payment_type is known + (payment_type, payment_method) combo is allowed.
--    Kept as a trigger (not a CHECK constraint) so the allowed-combo map stays flexible.
CREATE OR REPLACE FUNCTION public.validate_payment_type_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  allowed_methods text[];
BEGIN
  IF NEW.payment_type IS NULL THEN
    RETURN NEW; -- allow null (legacy/inserts that populate later)
  END IF;

  allowed_methods := CASE NEW.payment_type
    WHEN '30_day_account' THEN ARRAY['pay_credit_card','pay_direct_debit','account_cash']
    WHEN '7_day_account'  THEN ARRAY['credit_card','direct_debit','cash']
    WHEN 'trade'          THEN ARRAY['credit_card','direct_debit','cash']
    WHEN 'card_on_file'   THEN ARRAY['credit_card','direct_debit','cash']
    WHEN 'residential'    THEN ARRAY['credit_card','direct_debit','cash']
    WHEN 'cod'            THEN ARRAY['cash','direct_debit','credit_card']
    ELSE NULL
  END;

  IF allowed_methods IS NULL THEN
    RAISE EXCEPTION 'Invalid payment_type: %', NEW.payment_type;
  END IF;

  IF NEW.payment_method IS NOT NULL
     AND NOT (NEW.payment_method = ANY(allowed_methods)) THEN
    RAISE EXCEPTION 'payment_method "%" is not allowed for payment_type "%"',
      NEW.payment_method, NEW.payment_type;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_type_method_trg ON public.orders;
CREATE TRIGGER validate_payment_type_method_trg
BEFORE INSERT OR UPDATE OF payment_type, payment_method ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_type_method();

-- 4) Index for the new Order Management filter
CREATE INDEX IF NOT EXISTS orders_payment_type_idx ON public.orders (payment_type);
