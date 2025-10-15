-- Add PIN columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS portal_access_pin TEXT,
ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pin_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

-- Create login attempts tracking table
CREATE TABLE IF NOT EXISTS public.portal_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('magic_link', 'pin')),
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.portal_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts" ON public.portal_login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can manage login attempts" ON public.portal_login_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portal_login_attempts_customer 
  ON public.portal_login_attempts(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_login_attempts_email 
  ON public.portal_login_attempts(email, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.portal_login_attempts IS 'Tracks all customer portal login attempts for security auditing';