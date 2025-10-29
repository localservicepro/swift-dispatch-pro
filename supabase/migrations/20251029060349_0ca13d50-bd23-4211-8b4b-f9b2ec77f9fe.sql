-- Fix trucks table security: Remove public access and restrict to admins only

-- Drop the insecure policy that allows everyone to view trucks
DROP POLICY IF EXISTS "Trucks are viewable by everyone" ON public.trucks;

-- Add secure policy: Only admins can view trucks
CREATE POLICY "Admins can view all trucks"
ON public.trucks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);

-- Add policy for drivers to view their assigned truck
CREATE POLICY "Drivers can view their assigned truck"
ON public.trucks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'driver'::user_role
  )
  AND id IN (
    SELECT DISTINCT truck_id 
    FROM public.orders 
    WHERE driver_id = auth.uid() 
    AND truck_id IS NOT NULL
  )
);