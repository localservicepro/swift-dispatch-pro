-- Update enable_customer_portal_access to be a simple toggle
CREATE OR REPLACE FUNCTION public.enable_customer_portal_access(
  p_customer_id uuid,
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  customer_record customers%ROWTYPE;
  new_status boolean;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Only admins can manage portal access';
  END IF;
  
  -- Get customer details
  SELECT * INTO customer_record FROM customers WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Verify customer has email
  IF customer_record.email IS NULL OR customer_record.email = '' THEN
    RAISE EXCEPTION 'Customer must have an email address to enable portal access';
  END IF;
  
  -- Toggle portal access status
  new_status := NOT COALESCE(customer_record.portal_access_enabled, false);
  
  UPDATE customers 
  SET 
    portal_access_enabled = new_status,
    updated_at = now()
  WHERE id = p_customer_id;
  
  -- Log activity
  PERFORM log_admin_activity(
    CASE WHEN new_status THEN 'enable_portal_access' ELSE 'disable_portal_access' END,
    'customer',
    p_customer_id,
    jsonb_build_object('new_status', new_status),
    NULL,
    NULL,
    format('%s portal access for customer %s', 
           CASE WHEN new_status THEN 'Enabled' ELSE 'Disabled' END,
           COALESCE(customer_record.first_name || ' ' || customer_record.last_name, customer_record.email))
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'portal_access_enabled', new_status,
    'message', format('Portal access %s successfully', 
                      CASE WHEN new_status THEN 'enabled' ELSE 'disabled' END)
  );
END;
$$;