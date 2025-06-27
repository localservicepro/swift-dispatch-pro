
-- First, let's clean up duplicate invoices by keeping only the most recent one for each order
WITH duplicate_invoices AS (
  SELECT id, order_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at DESC) as rn
  FROM public.invoices
  WHERE order_id IS NOT NULL
)
DELETE FROM public.invoices 
WHERE id IN (
  SELECT id FROM duplicate_invoices WHERE rn > 1
);

-- Remove any invoices that don't have an order_id (orphaned invoices)
DELETE FROM public.invoices WHERE order_id IS NULL;

-- Now remove batch invoice fields and enforce one-to-one invoice-to-order relationship
ALTER TABLE public.orders DROP COLUMN IF EXISTS batch_invoice_id;

-- Drop batch invoice related columns from invoices table
ALTER TABLE public.invoices 
DROP COLUMN IF EXISTS related_order_ids,
DROP COLUMN IF EXISTS is_batch_invoice,
DROP COLUMN IF EXISTS batch_invoice_type;

-- Ensure order_id is properly constrained as foreign key
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_order_id_fkey;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add unique constraint to ensure one invoice per order
ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_order_id_unique 
UNIQUE (order_id);

-- Make order_id NOT NULL since every invoice should have an order
ALTER TABLE public.invoices 
ALTER COLUMN order_id SET NOT NULL;
