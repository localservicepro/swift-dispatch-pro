
-- Create enum for order status
CREATE TYPE order_status AS ENUM ('preparing', 'loading', 'en_route', 'delivered', 'cancelled');

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'driver');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'driver',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  products JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'preparing',
  driver_id UUID REFERENCES public.profiles(id),
  admin_id UUID REFERENCES public.profiles(id),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery status updates table for tracking
CREATE TABLE public.delivery_status_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  old_status order_status,
  new_status order_status NOT NULL,
  notes TEXT,
  location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery photos table
CREATE TABLE public.delivery_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.profiles(id) NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'proof_of_delivery',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for orders
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Drivers can view their assigned orders" ON public.orders
  FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update their assigned orders" ON public.orders
  FOR UPDATE USING (driver_id = auth.uid());

-- Create RLS policies for delivery status updates
CREATE POLICY "Users can view updates for their orders" ON public.delivery_status_updates
  FOR SELECT USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Drivers can create status updates" ON public.delivery_status_updates
  FOR INSERT WITH CHECK (driver_id = auth.uid());

-- Create RLS policies for delivery photos
CREATE POLICY "Users can view photos for their orders" ON public.delivery_photos
  FOR SELECT USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Drivers can upload photos" ON public.delivery_photos
  FOR INSERT WITH CHECK (driver_id = auth.uid());

-- Create storage bucket for delivery photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('delivery-photos', 'delivery-photos', true);

-- Create storage policies
CREATE POLICY "Drivers can upload delivery photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'delivery-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view delivery photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'delivery-photos');

-- Create trigger function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'driver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update order status
CREATE OR REPLACE FUNCTION public.update_order_status(
  order_id UUID,
  new_status order_status,
  notes TEXT DEFAULT NULL,
  location JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  old_status order_status;
  current_driver_id UUID;
BEGIN
  -- Get current status and driver
  SELECT status, driver_id INTO old_status, current_driver_id
  FROM public.orders WHERE id = order_id;
  
  -- Update order status
  UPDATE public.orders 
  SET status = new_status, updated_at = NOW()
  WHERE id = order_id AND driver_id = auth.uid();
  
  -- Insert status update record
  INSERT INTO public.delivery_status_updates (
    order_id, driver_id, old_status, new_status, notes, location
  ) VALUES (
    order_id, auth.uid(), old_status, new_status, notes, location
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
