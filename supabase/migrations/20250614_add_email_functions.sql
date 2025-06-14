
-- Create a function to safely fetch email logs
CREATE OR REPLACE FUNCTION get_email_logs()
RETURNS TABLE (
  id UUID,
  email_type TEXT,
  recipient_email TEXT,
  subject TEXT,
  status TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
AS $$
  SELECT 
    id,
    email_type,
    recipient_email,
    subject,
    status,
    error_message,
    sent_at
  FROM email_logs
  ORDER BY sent_at DESC
  LIMIT 50;
$$;
