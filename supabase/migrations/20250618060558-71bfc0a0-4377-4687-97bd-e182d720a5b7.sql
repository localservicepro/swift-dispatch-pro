
-- Add soft delete columns to orders table
ALTER TABLE public.orders 
ADD COLUMN deleted_at timestamp with time zone,
ADD COLUMN deleted_by uuid REFERENCES public.profiles(id);

-- Create index for performance on deleted_at queries
CREATE INDEX idx_orders_deleted_at ON public.orders(deleted_at);

-- Create function to soft delete an order
CREATE OR REPLACE FUNCTION public.soft_delete_order(
  p_order_id uuid,
  p_reason text DEFAULT 'Admin deletion'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orders 
  SET 
    deleted_at = now(),
    deleted_by = auth.uid(),
    updated_at = now()
  WHERE id = p_order_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already deleted';
  END IF;
END;
$$;

-- Create function to restore a soft deleted order
CREATE OR REPLACE FUNCTION public.restore_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.orders 
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = p_order_id AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not deleted';
  END IF;
END;
$$;

-- Update existing cancelled orders to be soft deleted (optional migration)
UPDATE public.orders 
SET 
  deleted_at = updated_at,
  deleted_by = admin_id
WHERE status = 'cancelled' AND deleted_at IS NULL;
