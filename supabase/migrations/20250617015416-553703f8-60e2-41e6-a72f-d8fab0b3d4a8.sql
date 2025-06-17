
-- Create SMS settings table for Twilio configuration
CREATE TABLE public.sms_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  sender_name TEXT NOT NULL DEFAULT 'SwiftDispatch Pro',
  sms_provider TEXT NOT NULL DEFAULT 'twilio',
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  
  -- SMS notification preferences
  order_confirmation_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_status_enabled BOOLEAN NOT NULL DEFAULT true,
  driver_assignment_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_confirmation_enabled BOOLEAN NOT NULL DEFAULT false,
  
  last_tested_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SMS logs table for tracking all SMS communications
CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  twilio_message_sid TEXT,
  error_message TEXT,
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES public.customers(id),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add SMS preferences to customers table
ALTER TABLE public.customers 
ADD COLUMN sms_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN sms_opt_out_date TIMESTAMPTZ;

-- Enable RLS on SMS tables
ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sms_settings (admin only)
CREATE POLICY "Admin can view SMS settings" ON public.sms_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert SMS settings" ON public.sms_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update SMS settings" ON public.sms_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for sms_logs (admin can view all, drivers can view their related logs)
CREATE POLICY "Admin can view all SMS logs" ON public.sms_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert SMS logs" ON public.sms_logs
  FOR INSERT WITH CHECK (true);

-- Insert default SMS settings
INSERT INTO public.sms_settings (
  sender_name,
  sms_provider,
  connection_status,
  order_confirmation_enabled,
  delivery_status_enabled,
  driver_assignment_enabled,
  payment_confirmation_enabled
) VALUES (
  'SwiftDispatch Pro',
  'twilio',
  'disconnected',
  true,
  true,
  true,
  false
);
