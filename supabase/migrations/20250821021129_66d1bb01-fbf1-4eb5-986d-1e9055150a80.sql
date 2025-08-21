-- Fix self-referencing FK to allow bulk deletes of master + split orders
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_master_order_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_master_order_id_fkey
  FOREIGN KEY (master_order_id)
  REFERENCES public.orders(id)
  ON DELETE CASCADE;