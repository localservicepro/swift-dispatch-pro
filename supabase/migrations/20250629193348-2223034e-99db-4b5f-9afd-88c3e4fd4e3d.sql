
-- Add comprehensive RLS policies for orders_export table to fix trigger failures

-- Policy for service role to perform all operations (needed for triggers)
CREATE POLICY "Service role can manage orders_export" ON public.orders_export
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for authenticated users to insert/update/delete their own data
CREATE POLICY "Authenticated users can manage orders_export" ON public.orders_export
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for admins to perform all operations
CREATE POLICY "Admins can manage all orders_export" ON public.orders_export
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
