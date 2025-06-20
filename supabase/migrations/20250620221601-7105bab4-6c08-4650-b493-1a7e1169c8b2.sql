
-- Add product_type column to products table
ALTER TABLE public.products 
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'single' 
CHECK (product_type IN ('single', 'variable'));

-- Add comment for clarity
COMMENT ON COLUMN public.products.product_type IS 'Type of product: single (fixed pricing) or variable (pricing per variation)';
