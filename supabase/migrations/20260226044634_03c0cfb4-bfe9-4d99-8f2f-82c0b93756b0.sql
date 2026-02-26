
-- Allow drivers to insert orders
CREATE POLICY "Drivers can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);

-- Allow drivers to insert order items
CREATE POLICY "Drivers can insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);

-- Allow drivers to view payment settings (needed for order creation service)
CREATE POLICY "Drivers can view payment settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);

-- Allow drivers to view customers (needed to search/select customer during order creation)
CREATE POLICY "Drivers can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);
