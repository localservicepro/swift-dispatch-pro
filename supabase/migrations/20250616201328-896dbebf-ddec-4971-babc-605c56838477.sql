
-- Create trucks table to store individual truck information
CREATE TABLE public.trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  truck_type truck_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, assigned, maintenance, out_of_service
  capacity_tons NUMERIC,
  fuel_type TEXT DEFAULT 'diesel',
  year_manufactured INTEGER,
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Add truck_id to orders table to track specific truck assignments
ALTER TABLE public.orders 
ADD COLUMN truck_id UUID REFERENCES public.trucks(id);

-- Insert the trucks from your list
INSERT INTO public.trucks (registration_number, truck_type, capacity_tons) VALUES
-- Small trucks
('XV96KT', 'small', 3),
('1JT6HU', 'small', 3),
('XW66HV', 'small', 3),
('XV55MJ', 'small', 3),
('XV22YG', 'small', 3),

-- Medium trucks
('IDL2FL', 'medium', 8),
('XV74UB', 'medium', 8),
('XV54UL', 'medium', 8),

-- Large trucks
('XW18OJ', 'large', 15),
('XW40PF', 'large', 15),
('WHG598', 'large', 15),
('TUH714', 'large', 15),
('XV14QA', 'large', 15),

-- Crane truck
('1EV2VK', 'crane', 10);

-- Create index for better performance
CREATE INDEX idx_trucks_type_status ON public.trucks(truck_type, status);
CREATE INDEX idx_orders_truck_id ON public.orders(truck_id);

-- Enable RLS on trucks table
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

-- Create policies for trucks table
CREATE POLICY "Trucks are viewable by everyone" ON public.trucks FOR SELECT USING (true);
CREATE POLICY "Only admins can modify trucks" ON public.trucks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
