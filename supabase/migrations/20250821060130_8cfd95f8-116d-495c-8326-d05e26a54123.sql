-- Function to set a contact as primary for a customer
CREATE OR REPLACE FUNCTION public.set_primary_contact(p_customer_id uuid, p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_exists BOOLEAN;
  customer_type TEXT;
BEGIN
  -- Check if user is admin
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Only admins can set primary contacts';
  END IF;
  
  -- Validate the contact exists and belongs to the customer
  SELECT EXISTS(
    SELECT 1 FROM customer_contacts 
    WHERE id = p_contact_id 
    AND customer_id = p_customer_id 
    AND is_active = true
  ) INTO contact_exists;
  
  IF NOT contact_exists THEN
    RAISE EXCEPTION 'Contact not found or does not belong to this customer';
  END IF;
  
  -- Check if customer is account type (only account customers can have multiple contacts)
  SELECT customer_type INTO customer_type
  FROM customers 
  WHERE id = p_customer_id;
  
  IF customer_type != 'account' THEN
    RAISE EXCEPTION 'Only account customers can have multiple contacts with primary designation';
  END IF;
  
  -- Begin transaction to ensure atomicity
  -- First, unset any existing primary contact for this customer
  UPDATE customer_contacts 
  SET 
    is_primary_contact = false,
    updated_at = now()
  WHERE customer_id = p_customer_id 
  AND is_primary_contact = true
  AND id != p_contact_id;
  
  -- Set the new contact as primary
  UPDATE customer_contacts 
  SET 
    is_primary_contact = true,
    updated_at = now()
  WHERE id = p_contact_id;
  
  -- Log the activity
  PERFORM log_admin_activity(
    'set_primary_contact',
    'customer_contact',
    p_contact_id,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'contact_id', p_contact_id
    ),
    NULL,
    NULL,
    format('Set contact %s as primary for customer %s', p_contact_id, p_customer_id)
  );
END;
$function$;