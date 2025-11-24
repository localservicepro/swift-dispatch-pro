-- Security Fix: Block unauthorized signups and ensure proper role management

-- Drop the old trigger that auto-creates profiles for any signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new secure function that ONLY allows admin-created users
CREATE OR REPLACE FUNCTION public.handle_new_user_secure()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if user was created by admin (has user_metadata.role set)
  IF NEW.raw_user_meta_data ? 'role' THEN
    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver')
    );
    
    -- Also insert into user_roles table for proper security
    INSERT INTO public.user_roles (user_id, role, customer_id)
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver'),
      NULL
    )
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'User created by admin: % with role: %', NEW.email, NEW.raw_user_meta_data->>'role';
  ELSE
    -- Log unauthorized signup attempt
    RAISE WARNING 'Unauthorized signup attempt blocked for email: %', NEW.email;
    
    -- Block the signup by raising an exception
    RAISE EXCEPTION 'Self-registration is not allowed. Please contact your administrator for access.';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE WARNING 'Error in handle_new_user_secure: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with new secure function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_secure();

-- Ensure all existing users have entries in user_roles (data migration)
INSERT INTO public.user_roles (user_id, role, customer_id)
SELECT p.id, p.role, NULL
FROM public.profiles p
WHERE p.role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = p.role
  )
ON CONFLICT (user_id, role) DO NOTHING;