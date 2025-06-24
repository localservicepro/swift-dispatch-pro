
-- Add RLS policies to allow service role access to invoices
CREATE POLICY "Service role can access all invoices" ON public.invoices
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Ensure service role can access orders for both individual and batch invoices
CREATE POLICY "Service role can access all orders" ON public.orders
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Make sure these policies have higher priority by recreating them
DROP POLICY IF EXISTS "Users can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Update invoices" ON public.invoices;

-- Recreate basic policies for regular users
CREATE POLICY "Users can view all invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Update invoices" ON public.invoices FOR UPDATE USING (true);
