-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create business_settings table for storing business profile information
CREATE TABLE public.business_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'SwiftDispatch Pro',
  business_email TEXT NOT NULL DEFAULT 'info@swiftdispatch.com.au', 
  business_phone TEXT NOT NULL DEFAULT '+61 2 9876 5432',
  business_website TEXT,
  business_address TEXT,
  logo_url TEXT,
  abn TEXT,
  tax_number TEXT,
  registration_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable Row Level Security
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can view business settings" 
ON public.business_settings 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can insert business settings" 
ON public.business_settings 
FOR INSERT 
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update business settings" 
ON public.business_settings 
FOR UPDATE 
USING (is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business settings if none exist
INSERT INTO public.business_settings (business_name, business_email, business_phone)
VALUES ('SwiftDispatch Pro', 'info@swiftdispatch.com.au', '+61 2 9876 5432');