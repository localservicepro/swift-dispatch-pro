
-- Create a security definer function to check if the current user is an admin
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new role-based policies for profiles table
-- Policy 1: Allow users to view their own profile OR allow admins to view all profiles
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles
FOR SELECT 
USING (
  auth.uid() = id OR public.is_current_user_admin()
);

-- Policy 2: Allow users to update their own profile OR allow admins to update any profile
CREATE POLICY "Users can update own profile or admins can update any" 
ON public.profiles
FOR UPDATE 
USING (
  auth.uid() = id OR public.is_current_user_admin()
);

-- Policy 3: Allow admins to insert new profiles (for user creation)
CREATE POLICY "Admins can insert profiles" 
ON public.profiles
FOR INSERT 
WITH CHECK (public.is_current_user_admin());

-- Policy 4: Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles
FOR DELETE 
USING (public.is_current_user_admin());
