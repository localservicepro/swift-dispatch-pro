-- Allow anon role to SELECT active suburbs for storefront delivery fee lookup
CREATE POLICY "Anon can view active suburbs"
ON public.suburbs
FOR SELECT
TO anon
USING (is_active = true);