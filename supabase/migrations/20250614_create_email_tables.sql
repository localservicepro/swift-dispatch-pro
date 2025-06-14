
-- Create email preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  order_confirmations BOOLEAN DEFAULT true,
  delivery_updates BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  promotional_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Create function to automatically send order confirmation emails
CREATE OR REPLACE FUNCTION send_order_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function to send order confirmation email
  PERFORM net.http_post(
    url := 'https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/send-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
    body := json_build_object(
      'type', 'order-confirmation',
      'data', json_build_object(
        'customerName', NEW.customer_name,
        'customerEmail', 'customer@example.com', -- You'll need to get actual email
        'orderNumber', NEW.order_number,
        'orderItems', NEW.products,
        'totalAmount', NEW.total_amount,
        'deliveryAddress', NEW.customer_address,
        'deliveryDate', NEW.delivery_date,
        'deliveryTime', NEW.delivery_time,
        'specialInstructions', NEW.special_instructions
      )
    )::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically send delivery status update emails
CREATE OR REPLACE FUNCTION send_delivery_status_email()
RETURNS TRIGGER AS $$
DECLARE
  driver_name TEXT;
BEGIN
  -- Only send email if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get driver name
    SELECT full_name INTO driver_name
    FROM profiles
    WHERE id = NEW.driver_id;
    
    -- Call the edge function to send delivery status update email
    PERFORM net.http_post(
      url := 'https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/send-emails',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body := json_build_object(
        'type', 'delivery-status-update',
        'data', json_build_object(
          'customerName', NEW.customer_name,
          'customerEmail', 'customer@example.com', -- You'll need to get actual email
          'orderNumber', NEW.order_number,
          'oldStatus', OLD.status,
          'newStatus', NEW.status,
          'driverName', driver_name
        )
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_send_order_confirmation ON orders;
CREATE TRIGGER trigger_send_order_confirmation
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_order_confirmation_email();

DROP TRIGGER IF EXISTS trigger_send_delivery_status_update ON orders;
CREATE TRIGGER trigger_send_delivery_status_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_delivery_status_email();
