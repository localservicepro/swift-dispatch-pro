
-- First, check if there are existing policies and drop them
DROP POLICY IF EXISTS "Drivers can upload photos" ON public.delivery_photos;
DROP POLICY IF EXISTS "Drivers can insert photos" ON public.delivery_photos;

-- Create a proper INSERT policy that allows drivers to upload photos with their own driver_id
CREATE POLICY "Drivers can upload photos" ON public.delivery_photos
  FOR INSERT 
  WITH CHECK (driver_id = auth.uid());

-- Also ensure drivers can view their own uploaded photos
CREATE POLICY "Drivers can view their own photos" ON public.delivery_photos
  FOR SELECT 
  USING (driver_id = auth.uid());

-- Allow admins to view all photos for management purposes
CREATE POLICY "Admins can view all photos" ON public.delivery_photos
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
