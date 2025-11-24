-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create function to check if user can manage target user
-- Super admins can manage anyone except themselves
CREATE OR REPLACE FUNCTION public.can_manage_user(_actor_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cannot manage yourself
  IF _actor_id = _target_id THEN
    RETURN false;
  END IF;
  
  -- Only super admins can manage users
  RETURN is_super_admin(_actor_id);
END;
$$;

-- Create trigger function to prevent deletion of last super admin
CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_count INTEGER;
BEGIN
  -- Check if we're deleting a super_admin role
  IF OLD.role = 'super_admin' THEN
    -- Count remaining super_admins
    SELECT COUNT(*) INTO super_admin_count
    FROM public.user_roles
    WHERE role = 'super_admin'
      AND user_id != OLD.user_id;
    
    IF super_admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last super admin';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger on user_roles
DROP TRIGGER IF EXISTS prevent_last_super_admin_deletion_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_super_admin_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_super_admin_deletion();

-- Promote first admin to super_admin
DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  -- Get the first admin user
  SELECT user_id INTO first_admin_id
  FROM user_roles
  WHERE role = 'admin'
  ORDER BY id ASC
  LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    -- Add super_admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (first_admin_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Promoted first admin to super_admin: %', first_admin_id;
  ELSE
    RAISE WARNING 'No admin users found to promote';
  END IF;
END $$;