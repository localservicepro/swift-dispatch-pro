-- Fix critical security vulnerability: Remove public access to orders table
-- and ensure proper RLS policies are in place

-- First, let's check if RLS is enabled (it should be, but let's make sure)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop any policies that might allow public access
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public read access" ON public.orders;
DROP POLICY IF EXISTS "Enable public read access" ON public.orders;

-- Ensure we have the correct restrictive policies in place:

-- 1. Admins can manage all orders (should already exist, but recreate if needed)
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" 
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::user_role
  )
);

-- 2. Customers can only view their own orders
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders" 
ON public.orders
FOR SELECT
USING (
  customer_id IN (
    SELECT customers.id 
    FROM public.customers 
    WHERE customers.auth_user_id = auth.uid()
  )
);

-- 3. Drivers can view and update their assigned orders
DROP POLICY IF EXISTS "Drivers can view their assigned orders" ON public.orders;
CREATE POLICY "Drivers can view their assigned orders" 
ON public.orders
FOR SELECT
USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their assigned orders" ON public.orders;
CREATE POLICY "Drivers can update their assigned orders" 
ON public.orders
FOR UPDATE
USING (driver_id = auth.uid());

-- 4. Service role access for backend operations (edge functions)
DROP POLICY IF EXISTS "Service role can access all orders" ON public.orders;
CREATE POLICY "Service role can access all orders" 
ON public.orders
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (true);

-- Remove any duplicate policies that might have been created
DROP POLICY IF EXISTS "Enable all operations for admins" ON public.orders;
DROP POLICY IF EXISTS "Enable drivers to update assigned orders" ON public.orders;