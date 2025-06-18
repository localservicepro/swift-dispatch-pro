
-- Create activity_logs table to track all admin actions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.profiles(id) NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'order', 'customer', 'invoice', 'payment', etc.
  target_id UUID, -- ID of the affected entity
  target_details JSONB, -- Additional details about the target (order number, customer name, etc.)
  old_values JSONB, -- Previous values for updates
  new_values JSONB, -- New values for updates
  description TEXT NOT NULL, -- Human readable description
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) - only admins can see activity logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all activity logs
CREATE POLICY "Admins can view all activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (is_current_user_admin());

-- Create policy for admins to insert activity logs
CREATE POLICY "Admins can insert activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (is_current_user_admin());

-- Create indexes for better query performance
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_admin_id ON public.activity_logs(admin_id);
CREATE INDEX idx_activity_logs_target_type ON public.activity_logs(target_type);
CREATE INDEX idx_activity_logs_target_id ON public.activity_logs(target_id);

-- Create a function to log activities
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID DEFAULT NULL,
  p_target_details JSONB DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    target_details,
    old_values,
    new_values,
    description
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_type,
    p_target_id,
    p_target_details,
    p_old_values,
    p_new_values,
    p_description
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
