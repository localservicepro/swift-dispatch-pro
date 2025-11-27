-- Drop all broken policies that check profiles.role incorrectly

-- trucks table (3 policies)
DROP POLICY IF EXISTS "Admins can view all trucks" ON trucks;
DROP POLICY IF EXISTS "Drivers can view their assigned truck" ON trucks;
DROP POLICY IF EXISTS "Only admins can modify trucks" ON trucks;

-- products table (1 policy)
DROP POLICY IF EXISTS "Admins can manage products" ON products;

-- product_variants table (1 policy)
DROP POLICY IF EXISTS "Admins can manage product variants" ON product_variants;

-- product_variant_attributes table (1 policy)
DROP POLICY IF EXISTS "Admins can manage product variant attributes" ON product_variant_attributes;

-- product_specials table (1 policy)
DROP POLICY IF EXISTS "Admins can manage specials" ON product_specials;

-- suburbs table (1 policy)
DROP POLICY IF EXISTS "Admins can manage suburbs" ON suburbs;

-- order_items table (1 policy)
DROP POLICY IF EXISTS "Enable all operations for admins" ON order_items;

-- stripe_settings table (2 policies)
DROP POLICY IF EXISTS "Admin can view stripe settings" ON stripe_settings;
DROP POLICY IF EXISTS "Admin can update stripe settings" ON stripe_settings;

-- user_roles table (1 policy)
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Recreate all policies using correct role-checking functions

-- trucks table policies
CREATE POLICY "Admins can view all trucks" ON trucks
FOR SELECT TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "Drivers can view their assigned truck" ON trucks
FOR SELECT TO authenticated 
USING (
  is_driver(auth.uid()) AND id IN (
    SELECT DISTINCT truck_id FROM orders 
    WHERE driver_id = auth.uid() AND truck_id IS NOT NULL
  )
);

CREATE POLICY "Only admins can modify trucks" ON trucks
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- products table policy
CREATE POLICY "Admins can manage products" ON products
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- product_variants table policy
CREATE POLICY "Admins can manage product variants" ON product_variants
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- product_variant_attributes table policy
CREATE POLICY "Admins can manage product variant attributes" ON product_variant_attributes
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- product_specials table policy
CREATE POLICY "Admins can manage specials" ON product_specials
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- suburbs table policy
CREATE POLICY "Admins can manage suburbs" ON suburbs
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- order_items table policy
CREATE POLICY "Enable all operations for admins" ON order_items
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- stripe_settings table policies
CREATE POLICY "Admin can view stripe settings" ON stripe_settings
FOR SELECT TO authenticated 
USING (is_current_user_admin());

CREATE POLICY "Admin can update stripe settings" ON stripe_settings
FOR UPDATE TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- user_roles table policy
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());