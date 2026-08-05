ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_placed_via_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_placed_via_check
  CHECK (placed_via = ANY (ARRAY['admin'::text, 'portal'::text, 'storefront'::text, 'yard_sale'::text]));