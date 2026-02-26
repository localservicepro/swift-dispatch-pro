
CREATE OR REPLACE FUNCTION public.populate_order_sms_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
      NEW.delivery_time,
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
