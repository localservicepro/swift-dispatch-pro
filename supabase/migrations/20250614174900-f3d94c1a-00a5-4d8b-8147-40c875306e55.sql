
-- Add 'customer' role to the existing user_role enum
ALTER TYPE user_role ADD VALUE 'customer';

-- Add auth_user_id column to customers table to link with auth users
ALTER TABLE public.customers 
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance on auth_user_id lookups
CREATE INDEX idx_customers_auth_user_id ON public.customers(auth_user_id);

-- Update the handle_new_user function to support customer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for customers to access their own data
CREATE POLICY "Customers can view their own customer record" ON public.customers
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Customers can update their own customer record" ON public.customers
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Allow customers to view their own orders
CREATE POLICY "Customers can view their own orders" ON public.orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
    )
  );

-- Allow customers to view products (read-only access)
CREATE POLICY "Customers can view active products" ON public.products
  FOR SELECT USING (is_active = true);

-- Allow customers to view product categories
CREATE POLICY "Customers can view active product categories" ON public.product_categories
  FOR SELECT USING (is_active = true);

-- Allow customers to view suburbs for delivery options
CREATE POLICY "Customers can view active suburbs" ON public.suburbs
  FOR SELECT USING (is_active = true);

-- Allow customers to view order items for their orders
CREATE POLICY "Customers can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON o.customer_id = c.id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Allow customers to view invoices for their orders
CREATE POLICY "Customers can view their own invoices" ON public.invoices
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON o.customer_id = c.id
      WHERE c.auth_user_id = auth.uid()
    )
  );
