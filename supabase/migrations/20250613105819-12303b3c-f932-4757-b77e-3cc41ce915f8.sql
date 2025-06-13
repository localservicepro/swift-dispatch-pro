
-- Create suburbs table for Australian states/territories with delivery rates
CREATE TABLE public.suburbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  delivery_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  full_address TEXT NOT NULL,
  suburb_id UUID REFERENCES public.suburbs(id),
  customer_type TEXT NOT NULL CHECK (customer_type IN ('trade', 'account')),
  billing_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.product_categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT UNIQUE,
  barcode TEXT,
  weight NUMERIC(10,2),
  dimensions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table to replace simple products JSON
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_id UUID REFERENCES public.customers(id),
ADD COLUMN delivery_date DATE,
ADD COLUMN delivery_time TIME,
ADD COLUMN truck_type TEXT,
ADD COLUMN subtotal NUMERIC(10,2) DEFAULT 0,
ADD COLUMN adjustments NUMERIC(10,2) DEFAULT 0,
ADD COLUMN delivery_fee NUMERIC(10,2) DEFAULT 0;

-- Add truck types enum
CREATE TYPE public.truck_type AS ENUM ('small', 'medium', 'large', 'refrigerated');

-- Update truck_type column to use enum
ALTER TABLE public.orders ALTER COLUMN truck_type TYPE public.truck_type USING truck_type::public.truck_type;

-- Insert sample Australian suburbs
INSERT INTO public.suburbs (name, state, postcode, delivery_rate) VALUES
('Sydney CBD', 'NSW', '2000', 15.00),
('Melbourne CBD', 'VIC', '3000', 15.00),
('Brisbane CBD', 'QLD', '4000', 20.00),
('Perth CBD', 'WA', '6000', 25.00),
('Adelaide CBD', 'SA', '5000', 20.00),
('Hobart CBD', 'TAS', '7000', 30.00),
('Darwin CBD', 'NT', '0800', 35.00),
('Canberra CBD', 'ACT', '2600', 18.00),
('Parramatta', 'NSW', '2150', 12.00),
('Bondi', 'NSW', '2026', 18.00),
('Richmond', 'VIC', '3121', 12.00),
('Surfers Paradise', 'QLD', '4217', 22.00);

-- Insert sample product categories
INSERT INTO public.product_categories (name, description) VALUES
('Beverages', 'All types of drinks and beverages'),
('Food', 'Food items and snacks'),
('Dairy', 'Milk, cheese, yogurt and dairy products'),
('Bakery', 'Bread, pastries and baked goods'),
('Produce', 'Fresh fruits and vegetables'),
('Meat & Seafood', 'Fresh and frozen meat and seafood'),
('Frozen Foods', 'Frozen meals and ingredients'),
('Pantry', 'Dry goods and pantry staples');

-- Insert sample products
INSERT INTO public.products (name, description, category_id, price, stock_quantity, sku) VALUES
('Coca Cola 375ml', 'Classic Coca Cola can', (SELECT id FROM public.product_categories WHERE name = 'Beverages'), 2.50, 100, 'COC001'),
('Pepsi 375ml', 'Pepsi cola can', (SELECT id FROM public.product_categories WHERE name = 'Beverages'), 2.50, 80, 'PEP001'),
('Orange Juice 1L', 'Fresh orange juice', (SELECT id FROM public.product_categories WHERE name = 'Beverages'), 4.99, 50, 'OJ001'),
('White Bread 700g', 'Fresh white bread loaf', (SELECT id FROM public.product_categories WHERE name = 'Bakery'), 3.50, 30, 'BR001'),
('Croissant', 'Butter croissant', (SELECT id FROM public.product_categories WHERE name = 'Bakery'), 2.99, 25, 'CR001'),
('Milk 2L', 'Fresh full cream milk', (SELECT id FROM public.product_categories WHERE name = 'Dairy'), 3.99, 40, 'MLK001'),
('Cheddar Cheese 500g', 'Aged cheddar cheese block', (SELECT id FROM public.product_categories WHERE name = 'Dairy'), 8.99, 20, 'CHE001'),
('Bananas 1kg', 'Fresh bananas', (SELECT id FROM public.product_categories WHERE name = 'Produce'), 3.99, 60, 'BAN001'),
('Apples 1kg', 'Red delicious apples', (SELECT id FROM public.product_categories WHERE name = 'Produce'), 4.99, 45, 'APP001'),
('Chicken Breast 1kg', 'Fresh chicken breast', (SELECT id FROM public.product_categories WHERE name = 'Meat & Seafood'), 12.99, 15, 'CHK001');

-- Enable RLS on new tables
ALTER TABLE public.suburbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suburbs (read-only for all authenticated users)
CREATE POLICY "Anyone can view suburbs" ON public.suburbs FOR SELECT TO authenticated USING (true);

-- Create RLS policies for customers (admins can manage all)
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create RLS policies for product categories (read for all, manage for admins)
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create RLS policies for products (read for all, manage for admins)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create RLS policies for order items (linked to orders)
CREATE POLICY "Users can view order items for their orders" ON public.order_items FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (driver_id = auth.uid() OR admin_id = auth.uid())));
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
