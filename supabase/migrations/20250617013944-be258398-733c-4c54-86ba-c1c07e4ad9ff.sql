
-- Create email_settings table to store email provider configurations
CREATE TABLE public.email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_api_key TEXT,
  sender_name TEXT NOT NULL DEFAULT 'SwiftDispatch Pro',
  sender_email TEXT NOT NULL DEFAULT 'updates@localservicepro.com.au',
  reply_to_email TEXT,
  email_provider TEXT NOT NULL DEFAULT 'resend',
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  last_tested_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on email_settings table
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for email_settings (admin only)
CREATE POLICY "Admin can view email settings" ON public.email_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert email settings" ON public.email_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update email settings" ON public.email_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default email settings
INSERT INTO public.email_settings (
  sender_name,
  sender_email,
  email_provider,
  connection_status
) VALUES (
  'SwiftDispatch Pro',
  'updates@localservicepro.com.au',
  'resend',
  'disconnected'
);
