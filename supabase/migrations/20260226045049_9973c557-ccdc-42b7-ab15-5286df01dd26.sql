CREATE POLICY "Drivers can view customer contacts"
ON public.customer_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'driver'
  )
);