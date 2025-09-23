-- Add assignment_status column to order_sms_webhooks table
ALTER TABLE public.order_sms_webhooks 
ADD COLUMN assignment_status text NOT NULL DEFAULT 'unassigned';

-- Update existing records based on driver_name
UPDATE public.order_sms_webhooks 
SET assignment_status = CASE 
  WHEN driver_name IS NOT NULL AND driver_name != '' THEN 'assigned'
  ELSE 'unassigned'
END;

-- Update the populate_order_sms_webhook function to include assignment_status
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
      contact_person,
      contact_phone,
      delivery_date,
      delivery_time,
      status,
      assignment_status
    ) VALUES (
      NEW.id,
      NEW.order_number,
      COALESCE(NEW.products_formatted, format_products_text(NEW.products)),
      NEW.driver_name,
      COALESCE(NEW.delivery_address, NEW.customer_address),
      NEW.customer_name,
      COALESCE(NEW.contact_name, NEW.customer_name),
      COALESCE(NEW.contact_phone, NEW.customer_phone),
      NEW.delivery_date,
      NEW.delivery_time,
      NEW.status,
      CASE 
        WHEN NEW.driver_id IS NOT NULL THEN 'assigned'
        ELSE 'unassigned'
      END
    )
    ON CONFLICT (order_id) DO UPDATE SET
      products_formatted = EXCLUDED.products_formatted,
      driver_name = EXCLUDED.driver_name,
      delivery_address = EXCLUDED.delivery_address,
      customer_name = EXCLUDED.customer_name,
      contact_person = EXCLUDED.contact_person,
      contact_phone = EXCLUDED.contact_phone,
      delivery_date = EXCLUDED.delivery_date,
      delivery_time = EXCLUDED.delivery_time,
      status = EXCLUDED.status,
      assignment_status = CASE 
        WHEN NEW.driver_id IS NOT NULL THEN 'assigned'
        ELSE 'unassigned'
      END,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;