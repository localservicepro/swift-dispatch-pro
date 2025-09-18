-- Create order_sms_webhooks table for CRM SMS integration
CREATE TABLE public.order_sms_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  order_number text NOT NULL,
  products_formatted text NOT NULL,
  driver_name text,
  delivery_address text NOT NULL,
  customer_name text NOT NULL,
  contact_person text,
  contact_phone text,
  delivery_date date,
  delivery_time time without time zone,
  status order_status NOT NULL DEFAULT 'requested',
  webhook_sent boolean NOT NULL DEFAULT false,
  webhook_sent_at timestamp with time zone,
  webhook_url text,
  webhook_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_sms_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage SMS webhook records" 
ON public.order_sms_webhooks 
FOR ALL 
USING (is_current_user_admin());

CREATE POLICY "Service role can manage SMS webhook records" 
ON public.order_sms_webhooks 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create trigger to update updated_at
CREATE TRIGGER update_order_sms_webhooks_updated_at
BEFORE UPDATE ON public.order_sms_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to populate SMS webhook table
CREATE OR REPLACE FUNCTION public.populate_order_sms_webhook()
RETURNS TRIGGER AS $$
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
      status
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
      NEW.status
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
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create unique constraint to prevent duplicates
ALTER TABLE public.order_sms_webhooks ADD CONSTRAINT order_sms_webhooks_order_id_key UNIQUE (order_id);

-- Create trigger on orders table
CREATE TRIGGER populate_sms_webhook_on_order_change
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.populate_order_sms_webhook();