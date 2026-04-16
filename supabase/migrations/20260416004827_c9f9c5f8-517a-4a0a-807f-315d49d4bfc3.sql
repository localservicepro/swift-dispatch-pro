
ALTER TABLE public.payment_settings ADD COLUMN fuel_surcharge numeric NOT NULL DEFAULT 5.00;

CREATE POLICY "Anon can view payment settings"
ON public.payment_settings
FOR SELECT
TO anon
USING (true);
