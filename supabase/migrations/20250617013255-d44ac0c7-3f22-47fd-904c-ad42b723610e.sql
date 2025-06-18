
-- Create payment_settings table to store fee configurations
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  default_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  service_charge_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_rate >= 0 AND service_charge_rate <= 100),
  currency TEXT NOT NULL DEFAULT 'AUD',
  include_gst_in_prices BOOLEAN NOT NULL DEFAULT true,
  gst_label TEXT NOT NULL DEFAULT 'GST',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create stripe_settings table to store API key configurations
CREATE TABLE public.stripe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_publishable_key TEXT,
  test_secret_key TEXT,
  live_publishable_key TEXT,
  live_secret_key TEXT,
  is_live_mode BOOLEAN NOT NULL DEFAULT false,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  last_tested_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_settings (admin only)
CREATE POLICY "Admin can view payment settings" ON public.payment_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert payment settings" ON public.payment_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update payment settings" ON public.payment_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for stripe_settings (admin only)
CREATE POLICY "Admin can view stripe settings" ON public.stripe_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert stripe settings" ON public.stripe_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update stripe settings" ON public.stripe_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default payment settings
INSERT INTO public.payment_settings (
  gst_rate,
  default_delivery_fee,
  service_charge_rate,
  currency,
  include_gst_in_prices,
  gst_label
) VALUES (
  10.00,
  5.00,
  0.00,
  'AUD',
  true,
  'GST'
);

-- Insert default stripe settings
INSERT INTO public.stripe_settings (
  is_live_mode,
  connection_status
) VALUES (
  false,
  'disconnected'
);
