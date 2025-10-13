-- Fix security issue: Set search_path on sync_customer_user_role function
CREATE OR REPLACE FUNCTION sync_customer_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When portal access is enabled and auth_user_id exists
  IF NEW.portal_access_enabled = true AND NEW.auth_user_id IS NOT NULL THEN
    -- Ensure user_roles entry exists with correct customer_id
    INSERT INTO public.user_roles (user_id, role, customer_id)
    VALUES (NEW.auth_user_id, 'account_customer'::user_role, NEW.id)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET customer_id = NEW.id;
  ELSIF NEW.portal_access_enabled = false AND OLD.portal_access_enabled = true THEN
    -- Remove account_customer role when portal access is disabled
    DELETE FROM public.user_roles 
    WHERE user_id = NEW.auth_user_id 
    AND role = 'account_customer'::user_role;
  END IF;
  
  RETURN NEW;
END;
$$;