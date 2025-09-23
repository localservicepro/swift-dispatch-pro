-- Add company_name column to order_sms_webhooks table
ALTER TABLE public.order_sms_webhooks 
ADD COLUMN company_name text;

-- Update the populate_order_sms_webhook function to include company name and format delivery time
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
      delivery_address,
      customer_name,
      company_name,
      contact_person,
      contact_phone,
      delivery_date,
      delivery_time,
      status,
      assignment_status
    ) 
    SELECT 
      NEW.id,
      NEW.order_number,
      COALESCE(NEW.products_formatted, format_products_text(NEW.products)),
      NEW.driver_name,
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
      END
    FROM customers c
    WHERE c.id = NEW.customer_id
    ON CONFLICT (order_id) DO UPDATE SET
      products_formatted = EXCLUDED.products_formatted,
      driver_name = EXCLUDED.driver_name,
      delivery_address = EXCLUDED.delivery_address,
      customer_name = EXCLUDED.customer_name,
      company_name = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      contact_phone = EXCLUDED.contact_phone,
      delivery_date = EXCLUDED.delivery_date,
      delivery_time = EXCLUDED.delivery_time,
      status = EXCLUDED.status,
      assignment_status = EXCLUDED.assignment_status,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Backfill existing records with company name and formatted delivery time
UPDATE public.order_sms_webhooks osw
SET 
  company_name = COALESCE(c.company_name, c.business_name),
  delivery_time = CASE 
    WHEN o.delivery_time IS NOT NULL THEN TO_CHAR(o.delivery_time, 'HH12:MI AM')
    ELSE osw.delivery_time
  END
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE osw.order_id = o.id;