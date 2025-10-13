-- Sync existing customers with portal access to user_roles table
-- This ensures all account customers with portal access have proper role entries
INSERT INTO user_roles (user_id, role, customer_id)
SELECT 
  c.auth_user_id,
  'account_customer'::user_role,
  c.id
FROM customers c
WHERE c.portal_access_enabled = true
  AND c.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = c.auth_user_id 
    AND ur.role = 'account_customer'
  )
ON CONFLICT (user_id, role) DO UPDATE
SET customer_id = EXCLUDED.customer_id;

-- Create function to automatically sync user_roles when portal access changes
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
    INSERT INTO user_roles (user_id, role, customer_id)
    VALUES (NEW.auth_user_id, 'account_customer'::user_role, NEW.id)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET customer_id = NEW.id;
  ELSIF NEW.portal_access_enabled = false AND OLD.portal_access_enabled = true THEN
    -- Remove account_customer role when portal access is disabled
    DELETE FROM user_roles 
    WHERE user_id = NEW.auth_user_id 
    AND role = 'account_customer'::user_role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS sync_customer_user_role_trigger ON customers;

-- Create trigger to automatically sync user_roles
CREATE TRIGGER sync_customer_user_role_trigger
  AFTER INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_user_role();