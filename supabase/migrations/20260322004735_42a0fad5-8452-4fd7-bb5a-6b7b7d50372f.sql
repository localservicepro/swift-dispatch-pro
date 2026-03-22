
-- Create myob_settings table
CREATE TABLE public.myob_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  company_file_id text,
  company_file_username text,
  company_file_password text,
  connection_status text NOT NULL DEFAULT 'not_configured',
  default_account_number text NOT NULL DEFAULT '4-1010',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.myob_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS policies
CREATE POLICY "Admins can view myob_settings" ON public.myob_settings
  FOR SELECT TO authenticated
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert myob_settings" ON public.myob_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update myob_settings" ON public.myob_settings
  FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());

-- Add myob_invoice_number to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS myob_invoice_number text;

-- Updated_at trigger for myob_settings
CREATE TRIGGER update_myob_settings_updated_at
  BEFORE UPDATE ON public.myob_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
