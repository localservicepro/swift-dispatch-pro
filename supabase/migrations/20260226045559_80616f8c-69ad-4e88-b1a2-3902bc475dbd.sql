-- Allow drivers to view orders they created (admin_id = their user id)
CREATE POLICY "Drivers can view orders they created"
ON public.orders
FOR SELECT
TO authenticated
USING (
  admin_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);