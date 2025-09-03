-- Fix Profile Role Update Vulnerability
-- Drop existing policies that allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;

-- Create separate policies for different operations
CREATE POLICY "Users can update own profile basic info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Add a trigger to prevent role changes by non-admins
CREATE OR REPLACE FUNCTION prevent_role_self_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is not an admin and trying to change their own role
  IF OLD.role IS DISTINCT FROM NEW.role AND 
     OLD.id = auth.uid() AND 
     NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_role_self_update ON public.profiles;
CREATE TRIGGER trigger_prevent_role_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_update();

-- Create admin-only role update policy
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