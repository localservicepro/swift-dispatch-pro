-- Create helper functions for tiered permission model

-- Check if user is a regular admin (not super_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Check if target user is a driver
CREATE OR REPLACE FUNCTION public.is_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'driver'
  )
$$;

-- Update can_manage_user function to support tiered permissions
-- Super admins can manage anyone except themselves
-- Regular admins can only manage drivers
CREATE OR REPLACE FUNCTION public.can_manage_user(_actor_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cannot manage yourself
  IF _actor_id = _target_id THEN
    RETURN false;
  END IF;
  
  -- Super admins can manage anyone
  IF is_super_admin(_actor_id) THEN
    RETURN true;
  END IF;
  
  -- Regular admins can only manage drivers
  IF is_admin(_actor_id) AND is_driver(_target_id) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;