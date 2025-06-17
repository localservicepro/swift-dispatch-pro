
-- Create table to store customer payment methods
CREATE TABLE public.customer_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_last_four TEXT NOT NULL,
  card_exp_month INTEGER NOT NULL,
  card_exp_year INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_customer_payment_methods_customer_id ON public.customer_payment_methods(customer_id);
CREATE INDEX idx_customer_payment_methods_stripe_customer ON public.customer_payment_methods(stripe_customer_id);
CREATE UNIQUE INDEX idx_customer_payment_methods_default ON public.customer_payment_methods(customer_id) WHERE is_default = true AND is_active = true;

-- Enable Row Level Security
ALTER TABLE public.customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view all payment methods" 
  ON public.customer_payment_methods 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert payment methods" 
  ON public.customer_payment_methods 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment methods" 
  ON public.customer_payment_methods 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete payment methods" 
  ON public.customer_payment_methods 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add stripe_customer_id to customers table if not exists
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer ON public.customers(stripe_customer_id);
