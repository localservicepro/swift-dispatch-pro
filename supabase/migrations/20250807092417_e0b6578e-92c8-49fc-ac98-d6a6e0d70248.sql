-- Add allows_fractional_quantities column to product_categories table
ALTER TABLE public.product_categories 
ADD COLUMN allows_fractional_quantities boolean NOT NULL DEFAULT false;

-- Update any existing "Bulk" categories to allow fractional quantities
UPDATE public.product_categories 
SET allows_fractional_quantities = true 
WHERE LOWER(name) LIKE '%bulk%' OR LOWER(name) LIKE '%specialised%';

-- Add comment to describe the column
COMMENT ON COLUMN public.product_categories.allows_fractional_quantities IS 'Determines if products in this category can be ordered in fractional quantities (0.25 increments) or only whole numbers';