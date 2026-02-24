
-- Create portal_pin_webhooks table
CREATE TABLE public.portal_pin_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  company_name text,
  pin_code text NOT NULL,
  pin_expires_at timestamp with time zone,
  is_regeneration boolean NOT NULL DEFAULT false,
  webhook_sent boolean NOT NULL DEFAULT false,
  webhook_sent_at timestamp with time zone,
  webhook_url text,
  webhook_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_pin_webhooks ENABLE ROW LEVEL SECURITY;

-- Admin access
CREATE POLICY "Admins can manage PIN webhook records"
  ON public.portal_pin_webhooks
  FOR ALL
  USING (is_current_user_admin());

-- Service role access (for edge functions)
CREATE POLICY "Service role can manage PIN webhook records"
  ON public.portal_pin_webhooks
  FOR ALL
  USING (auth.role() = 'service_role');
