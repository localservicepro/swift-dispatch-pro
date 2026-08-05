-- 1) Reversible backup of every value this migration touches
CREATE TABLE IF NOT EXISTS public.payment_type_repair_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_payment_type text,
  new_payment_type text NOT NULL,
  payment_method text,
  reason text NOT NULL,
  batch_tag text NOT NULL DEFAULT 'batch0_payment_type_repair',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_type_repair_backup TO authenticated;
GRANT ALL ON public.payment_type_repair_backup TO service_role;

ALTER TABLE public.payment_type_repair_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment type repair backup"
ON public.payment_type_repair_backup
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE INDEX IF NOT EXISTS idx_payment_type_repair_backup_order
  ON public.payment_type_repair_backup(order_id);

-- 2) Decouple payment_type (billing terms) from payment_method (settlement)
CREATE OR REPLACE FUNCTION public.validate_payment_type_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_type NOT IN (
    '30_day_account', '7_day_account', 'prepaid', 'cod',
    'card_on_file', 'trade', 'residential'
  ) THEN
    RAISE EXCEPTION 'Invalid payment_type: %', NEW.payment_type;
  END IF;

  -- payment_method is intentionally unconstrained here: how a transaction
  -- settled is independent of the customer's billing terms.
  RETURN NEW;
END;
$function$;

-- 3) Repair historical account orders (includes yard sale / pickup orders)
WITH targets AS (
  SELECT
    o.id,
    o.payment_type AS old_payment_type,
    o.payment_method,
    CASE
      WHEN o.payment_method = 'cod' THEN 'cod'
      WHEN o.payment_method = 'card_on_file' THEN 'card_on_file'
      WHEN o.payment_method = '7_day_invoice' THEN '7_day_account'
      ELSE '30_day_account'
    END AS new_payment_type
  FROM public.orders o
  JOIN public.customers c ON c.id = o.customer_id
  WHERE c.customer_type = 'account'
    AND (o.payment_type IS NULL OR o.payment_type IN ('residential', 'trade'))
),
logged AS (
  INSERT INTO public.payment_type_repair_backup
    (order_id, old_payment_type, new_payment_type, payment_method, reason)
  SELECT id, old_payment_type, new_payment_type, payment_method,
         'Account customer order missing/incorrect payment_type after 24 Jul backfill'
  FROM targets
  WHERE new_payment_type IS DISTINCT FROM old_payment_type
  RETURNING order_id, new_payment_type
)
UPDATE public.orders o
SET payment_type = l.new_payment_type,
    updated_at = now()
FROM logged l
WHERE o.id = l.order_id;
