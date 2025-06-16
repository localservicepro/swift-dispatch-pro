
-- Create storage policies for delivery-photos bucket
-- Allow authenticated users to upload to delivery-photos bucket
CREATE POLICY "Allow authenticated uploads to delivery-photos" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'delivery-photos' AND auth.role() = 'authenticated');

-- Allow users to view files in delivery-photos bucket  
CREATE POLICY "Allow public read access to delivery-photos" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'delivery-photos');

-- Allow users to update their own files (for potential future use)
CREATE POLICY "Allow users to update their own files in delivery-photos" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'delivery-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files (for potential future use)
CREATE POLICY "Allow users to delete their own files in delivery-photos" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'delivery-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
