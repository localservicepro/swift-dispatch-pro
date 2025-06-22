
-- Add fields to support batch invoicing
ALTER TABLE public.invoices 
ADD COLUMN related_order_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN is_batch_invoice BOOLEAN DEFAULT false,
ADD COLUMN batch_invoice_type TEXT DEFAULT 'single'; -- 'single', 'split_batch'

-- Add batch invoice reference to orders
ALTER TABLE public.orders 
ADD COLUMN batch_invoice_id UUID REFERENCES public.invoices(id);

-- Create index for performance (skip the existing one)
CREATE INDEX idx_orders_batch_invoice_id ON public.orders(batch_invoice_id);
CREATE INDEX idx_invoices_batch_type ON public.invoices(is_batch_invoice, batch_invoice_type);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.related_order_ids IS 'Array of order IDs included in this batch invoice';
COMMENT ON COLUMN public.invoices.is_batch_invoice IS 'True if this invoice covers multiple orders';
COMMENT ON COLUMN public.invoices.batch_invoice_type IS 'Type of batch: single, split_batch';
COMMENT ON COLUMN public.orders.batch_invoice_id IS 'Reference to the batch invoice this order belongs to';
