
-- Create email_logs table to track email sending history
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) - admins can see all email logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all email logs
CREATE POLICY "Admins can view all email logs" 
  ON public.email_logs 
  FOR SELECT 
  USING (is_current_user_admin());

-- Create policy for admins to insert email logs
CREATE POLICY "Admins can insert email logs" 
  ON public.email_logs 
  FOR INSERT 
  WITH CHECK (is_current_user_admin());

-- Create an index on sent_at for better query performance
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- Create an index on status for filtering
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
