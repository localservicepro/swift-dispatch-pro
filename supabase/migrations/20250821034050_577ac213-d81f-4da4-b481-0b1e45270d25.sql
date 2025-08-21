BEGIN;
-- 1) Break FK from orders to customers by nulling the reference
UPDATE public.orders SET customer_id = NULL WHERE customer_id IS NOT NULL;

-- 2) Remove dependent customer-related records
DELETE FROM public.customer_contacts;
DELETE FROM public.customer_payment_methods;
DELETE FROM public.customer_pricing_tiers;

-- 3) Delete all customers
DELETE FROM public.customers;
COMMIT;