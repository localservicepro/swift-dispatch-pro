ALTER TABLE public.payment_settings
  ADD COLUMN delivery_markup_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN delivery_markup_value numeric NOT NULL DEFAULT 0;