-- Fix security vulnerability: Remove overly permissive RLS policy
-- that allows all authenticated users to read orders

-- Drop the problematic policy that gives read access to all authenticated users
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.orders;

-- Verify we still have the correct specific policies:
-- 1. Admins can manage all orders (already exists)
-- 2. Customers can view their own orders (already exists) 
-- 3. Drivers can view their assigned orders (already exists)
-- 4. Service role can access all orders (already exists, needed for edge functions)

-- The remaining policies properly restrict access:
-- - Customers can only see orders where customer_id matches their customer record
-- - Drivers can only see orders assigned to them
-- - Admins can see all orders
-- - Service role access is preserved for backend operations