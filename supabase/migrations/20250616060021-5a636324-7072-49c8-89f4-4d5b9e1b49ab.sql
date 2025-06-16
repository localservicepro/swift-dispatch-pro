
-- Add GPS coordinates and tracking data to delivery_status_updates
ALTER TABLE public.delivery_status_updates 
ADD COLUMN IF NOT EXISTS gps_coordinates JSONB,
ADD COLUMN IF NOT EXISTS speed NUMERIC,
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS accuracy NUMERIC;

-- Create delivery_routes table for storing optimized routes
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_data JSONB NOT NULL, -- Mapbox route response
  waypoints JSONB NOT NULL, -- Array of coordinates
  estimated_duration INTEGER, -- in seconds
  estimated_distance NUMERIC, -- in meters
  actual_duration INTEGER, -- actual time taken
  actual_distance NUMERIC, -- actual distance traveled
  status TEXT DEFAULT 'planned', -- planned, active, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for delivery_routes
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own routes" 
  ON public.delivery_routes 
  FOR SELECT 
  USING (driver_id = auth.uid());

CREATE POLICY "Admins can view all routes" 
  ON public.delivery_routes 
  FOR SELECT 
  USING (is_current_user_admin());

CREATE POLICY "Drivers can insert their own routes" 
  ON public.delivery_routes 
  FOR INSERT 
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own routes" 
  ON public.delivery_routes 
  FOR UPDATE 
  USING (driver_id = auth.uid());

-- Add RLS policies for driver_locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own locations" 
  ON public.driver_locations 
  FOR SELECT 
  USING (driver_id = auth.uid());

CREATE POLICY "Admins can view all driver locations" 
  ON public.driver_locations 
  FOR SELECT 
  USING (is_current_user_admin());

CREATE POLICY "Drivers can insert their own locations" 
  ON public.driver_locations 
  FOR INSERT 
  WITH CHECK (driver_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_order_id ON public.delivery_routes(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver_id ON public.delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON public.driver_locations(timestamp DESC);

-- Enable real-time for the new tables
ALTER TABLE public.delivery_routes REPLICA IDENTITY FULL;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_routes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
