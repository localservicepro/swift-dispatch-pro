-- Add driver_email and driver_phone columns to order_sms_webhooks
ALTER TABLE public.order_sms_webhooks 
ADD COLUMN driver_email text,
ADD COLUMN driver_phone text;

-- Update the trigger function to include driver email and phone from profiles
CREATE OR REPLACE FUNCTION public.populate_order_sms_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create webhook record for certain statuses
  IF NEW.status IN ('preparing', 'loading', 'en_route', 'delivered') THEN
    INSERT INTO public.order_sms_webhooks (
      order_id,
      order_number,
      products_formatted,
      driver_name,
      driver_email,
      driver_phone,
      delivery_address,
      customer_name,
      company_name,
      contact_person,
      contact_phone,
      delivery_date,
      delivery_time,
      status,
      assignment_status,
      truck_registration,
      truck_type,
      delivery_notes,
      order_notes
    ) 
    SELECT 
      NEW.id,
      NEW.order_number,
      COALESCE(NEW.products_formatted, format_products_text(NEW.products)),
      NEW.driver_name,
      p.email,
      p.phone,
      COALESCE(NEW.delivery_address, NEW.customer_address),
      NEW.customer_name,
      COALESCE(c.company_name, c.business_name),
      COALESCE(NEW.contact_name, NEW.customer_name),
      COALESCE(NEW.contact_phone, NEW.customer_phone),
      NEW.delivery_date,
      CASE 
        WHEN NEW.delivery_time IS NOT NULL THEN TO_CHAR(NEW.delivery_time, 'HH12:MI AM')
        ELSE NULL
      END,
      NEW.status,
      CASE 
        WHEN NEW.driver_id IS NOT NULL THEN 'assigned'
        ELSE 'unassigned'
      END,
      NEW.truck_registration,
      NEW.truck_type_display,
      NEW.delivery_notes,
      NEW.order_notes
    FROM customers c
    LEFT JOIN profiles p ON p.id = NEW.driver_id
    WHERE c.id = NEW.customer_id
    ON CONFLICT (order_id) DO UPDATE SET
      products_formatted = EXCLUDED.products_formatted,
      driver_name = EXCLUDED.driver_name,
      driver_email = EXCLUDED.driver_email,
      driver_phone = EXCLUDED.driver_phone,
      delivery_address = EXCLUDED.delivery_address,
      customer_name = EXCLUDED.customer_name,
      company_name = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      contact_phone = EXCLUDED.contact_phone,
      delivery_date = EXCLUDED.delivery_date,
      delivery_time = EXCLUDED.delivery_time,
      status = EXCLUDED.status,
      assignment_status = EXCLUDED.assignment_status,
      truck_registration = EXCLUDED.truck_registration,
      truck_type = EXCLUDED.truck_type,
      delivery_notes = EXCLUDED.delivery_notes,
      order_notes = EXCLUDED.order_notes,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Backfill existing records with driver email and phone
UPDATE public.order_sms_webhooks osw
SET 
  driver_email = p.email,
  driver_phone = p.phone
FROM orders o
JOIN profiles p ON p.id = o.driver_id
WHERE osw.order_id = o.id AND o.driver_id IS NOT NULL;