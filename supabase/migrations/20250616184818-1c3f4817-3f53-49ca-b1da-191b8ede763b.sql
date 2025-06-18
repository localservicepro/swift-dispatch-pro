
-- Create the product-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Create storage policies for product-images bucket
-- Allow authenticated users to upload to product-images bucket
CREATE POLICY "Allow authenticated uploads to product-images" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow public read access to product-images bucket  
CREATE POLICY "Allow public read access to product-images" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'product-images');

-- Allow authenticated users to update files in product-images bucket
CREATE POLICY "Allow authenticated updates to product-images" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files in product-images bucket
CREATE POLICY "Allow authenticated deletes from product-images" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
