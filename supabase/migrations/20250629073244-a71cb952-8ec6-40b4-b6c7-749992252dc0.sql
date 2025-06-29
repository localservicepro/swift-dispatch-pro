
-- Create RLS policy that allows customers to insert their own records during signup
CREATE POLICY "Customers can create their own records" ON public.customers 
FOR INSERT TO authenticated 
WITH CHECK (auth_user_id = auth.uid());
