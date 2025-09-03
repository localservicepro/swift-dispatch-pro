-- Fix Profile Role Update Vulnerability
-- Drop existing policies that allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;

-- Create separate policies for different operations
CREATE POLICY "Users can update own profile basic info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from updating their own role
  OLD.role = NEW.role
);

CREATE POLICY "Only admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (is_current_user_admin()) 
WITH CHECK (is_current_user_admin());

-- Restrict public table access - Update suburbs table
DROP POLICY IF EXISTS "Anyone can view suburbs" ON public.suburbs;
CREATE POLICY "Authenticated users can view suburbs" 
ON public.suburbs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Restrict public table access - Update product_categories table  
DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;
CREATE POLICY "Authenticated users can view categories" 
ON public.product_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Update trucks table to require authentication (if policy exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'trucks' 
    AND policyname = 'Anyone can view trucks'
  ) THEN
    DROP POLICY "Anyone can view trucks" ON public.trucks;
    CREATE POLICY "Authenticated users can view trucks" 
    ON public.trucks 
    FOR SELECT 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;