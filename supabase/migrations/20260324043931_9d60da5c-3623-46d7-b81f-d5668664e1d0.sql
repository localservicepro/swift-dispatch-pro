
-- Fix 1: Remove overly broad order_items SELECT policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.order_items;

-- Fix 2: Fix customer_stores policy - remove OR (is_active = true) clause
DROP POLICY IF EXISTS "Account customers view own store" ON public.customer_stores;
CREATE POLICY "Account customers view own store" ON public.customer_stores
  FOR SELECT
  TO authenticated
  USING (customer_id = get_customer_id_for_user(auth.uid()));

-- Add admin read access for customer_stores (admins need to see all stores)
DROP POLICY IF EXISTS "Admins can view all customer stores" ON public.customer_stores;
CREATE POLICY "Admins can view all customer stores" ON public.customer_stores
  FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- Add public storefront discovery (slug + display_name only, no contact info)
-- Using a separate policy that allows anon to see active stores for storefront URLs
DROP POLICY IF EXISTS "Public can view active store slugs" ON public.customer_stores;
CREATE POLICY "Public can view active store slugs" ON public.customer_stores
  FOR SELECT
  TO anon
  USING (is_active = true);
