
-- Insert admin profile for existing authenticated users
-- This is a one-time fix for development
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    'admin'::user_role
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
    role = 'admin'::user_role;

-- Update RLS policies for customers to be more permissive during development
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

-- Create more permissive policy that allows authenticated users to manage customers
CREATE POLICY "Authenticated users can manage customers" ON public.customers 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- Also update suburbs policy to allow authenticated users to read suburbs
DROP POLICY IF EXISTS "Anyone can view suburbs" ON public.suburbs;
CREATE POLICY "Authenticated users can view suburbs" ON public.suburbs 
FOR SELECT TO authenticated 
USING (true);
