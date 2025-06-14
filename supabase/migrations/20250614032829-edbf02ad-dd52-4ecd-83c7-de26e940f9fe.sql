
-- Add payment-related fields to the orders table
ALTER TABLE public.orders 
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;

-- Create an index for better query performance on payment status
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);

-- Update existing orders to have appropriate payment status based on their delivery status
UPDATE public.orders 
SET payment_status = CASE 
  WHEN status = 'delivered' THEN 'paid'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END;
