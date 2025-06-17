
-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS trigger_send_order_confirmation ON orders;
DROP TRIGGER IF EXISTS trigger_send_delivery_status_update ON orders;
DROP FUNCTION IF EXISTS send_order_confirmation_email();
DROP FUNCTION IF EXISTS send_delivery_status_email();

-- Create improved function to send order confirmation emails
CREATE OR REPLACE FUNCTION send_order_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  customer_email TEXT;
BEGIN
  -- Get customer email from customers table
  SELECT email INTO customer_email
  FROM public.customers
  WHERE id = NEW.customer_id;
  
  -- Only send email if we have a customer email
  IF customer_email IS NOT NULL THEN
    -- Call the edge function to send order confirmation email
    PERFORM net.http_post(
      url := 'https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/send-emails',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body := json_build_object(
        'type', 'order-confirmation',
        'data', json_build_object(
          'customerName', NEW.customer_name,
          'customerEmail', customer_email,
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create improved function to send delivery status update emails
CREATE OR REPLACE FUNCTION send_delivery_status_email()
RETURNS TRIGGER AS $$
DECLARE
  customer_email TEXT;
  driver_name TEXT;
BEGIN
  -- Only send email if status actually changed and we're not just creating the order
  IF OLD.status IS DISTINCT FROM NEW.status AND TG_OP = 'UPDATE' THEN
    -- Get customer email from customers table
    SELECT email INTO customer_email
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- Get driver name if driver is assigned
    IF NEW.driver_id IS NOT NULL THEN
      SELECT full_name INTO driver_name
      FROM public.profiles
      WHERE id = NEW.driver_id;
    END IF;
    
    -- Only send email if we have a customer email
    IF customer_email IS NOT NULL THEN
      -- Call the edge function to send delivery status update email
      PERFORM net.http_post(
        url := 'https://wntcxbxitsanbyrtfhwv.supabase.co/functions/v1/send-emails',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
        body := json_build_object(
          'type', 'delivery-status-update',
          'data', json_build_object(
            'customerName', NEW.customer_name,
            'customerEmail', customer_email,
            'orderNumber', NEW.order_number,
            'oldStatus', OLD.status,
            'newStatus', NEW.status,
            'driverName', driver_name
          )
        )::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_send_order_confirmation
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_order_confirmation_email();

CREATE TRIGGER trigger_send_delivery_status_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION send_delivery_status_email();
