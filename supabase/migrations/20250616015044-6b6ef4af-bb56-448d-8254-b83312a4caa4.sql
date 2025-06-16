
-- Add images column to products table to store array of image URLs
ALTER TABLE public.products 
ADD COLUMN images text[] DEFAULT '{}';

-- Update the column to be not null with empty array as default
UPDATE public.products SET images = '{}' WHERE images IS NULL;
ALTER TABLE public.products ALTER COLUMN images SET NOT NULL;
