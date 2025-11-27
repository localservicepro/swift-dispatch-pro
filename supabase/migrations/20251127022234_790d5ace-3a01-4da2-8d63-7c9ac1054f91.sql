-- Step 1: Drop all policies that depend on is_current_user_admin()

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.profiles;

-- email_logs policies
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;

-- delivery_routes policies
DROP POLICY IF EXISTS "Admins can view all routes" ON public.delivery_routes;

-- driver_locations policies
DROP POLICY IF EXISTS "Admins can view all driver locations" ON public.driver_locations;

-- woocommerce policies
DROP POLICY IF EXISTS "Admins can manage WooCommerce product mapping" ON public.woocommerce_product_mapping;
DROP POLICY IF EXISTS "Admins can manage WooCommerce category mapping" ON public.woocommerce_category_mapping;
DROP POLICY IF EXISTS "Admins can view WooCommerce sync logs" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Admins can insert WooCommerce sync logs" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Admins can view WooCommerce sync settings" ON public.woocommerce_sync_settings;
DROP POLICY IF EXISTS "Admins can insert WooCommerce sync settings" ON public.woocommerce_sync_settings;
DROP POLICY IF EXISTS "Admins can update WooCommerce sync settings" ON public.woocommerce_sync_settings;
DROP POLICY IF EXISTS "Admins can delete WooCommerce sync settings" ON public.woocommerce_sync_settings;
DROP POLICY IF EXISTS "Admins can manage WooCommerce order mapping" ON public.woocommerce_order_mapping;
DROP POLICY IF EXISTS "Admins can manage WooCommerce customer mapping" ON public.woocommerce_customer_mapping;

-- order_returns policies
DROP POLICY IF EXISTS "Admins can manage all returns" ON public.order_returns;

-- customer_credits policies
DROP POLICY IF EXISTS "Admins can manage all customer credits" ON public.customer_credits;

-- order_sms_webhooks policies
DROP POLICY IF EXISTS "Admins can manage SMS webhook records" ON public.order_sms_webhooks;

-- activity_logs policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;

-- business_settings policies
DROP POLICY IF EXISTS "Admins can view business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can insert business settings" ON public.business_settings;

-- customer_contacts policies
DROP POLICY IF EXISTS "Admins can manage customer contacts" ON public.customer_contacts;

-- customer_payment_methods policies
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.customer_payment_methods;
DROP POLICY IF EXISTS "Admins can insert payment methods" ON public.customer_payment_methods;
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.customer_payment_methods;
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.customer_payment_methods;

-- customer_pricing_tiers policies
DROP POLICY IF EXISTS "Admins can manage customer pricing tiers" ON public.customer_pricing_tiers;

-- customers policies
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

-- delivery_photos policies
DROP POLICY IF EXISTS "Admins can view all photos" ON public.delivery_photos;
DROP POLICY IF EXISTS "Users can view photos for their orders" ON public.delivery_photos;

-- delivery_status_updates policies
DROP POLICY IF EXISTS "Enable all operations for admins" ON public.delivery_status_updates;
DROP POLICY IF EXISTS "Users can view updates for their orders" ON public.delivery_status_updates;

-- email_settings policies
DROP POLICY IF EXISTS "Admin can view email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Admin can insert email settings" ON public.email_settings;
DROP POLICY IF EXISTS "Admin can update email settings" ON public.email_settings;

-- invoices policies
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;

-- order_items policies
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable all operations for admins on order_items" ON public.order_items;

-- orders policies
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- payment_settings policies
DROP POLICY IF EXISTS "Admin can view payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Admin can insert payment settings" ON public.payment_settings;
DROP POLICY IF EXISTS "Admin can update payment settings" ON public.payment_settings;

-- portal_login_attempts policies
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.portal_login_attempts;

-- pricing_tiers policies
DROP POLICY IF EXISTS "Admins can manage pricing tiers" ON public.pricing_tiers;

-- product_attribute_values policies
DROP POLICY IF EXISTS "Admins can manage product attribute values" ON public.product_attribute_values;

-- product_attributes policies
DROP POLICY IF EXISTS "Admins can manage product attributes" ON public.product_attributes;

-- product_categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;

-- product_pricing policies
DROP POLICY IF EXISTS "Admins can manage product pricing" ON public.product_pricing;

-- product_special_items policies
DROP POLICY IF EXISTS "Admins can manage special items" ON public.product_special_items;

-- product_specials policies
DROP POLICY IF EXISTS "Admins can manage product specials" ON public.product_specials;

-- Step 2: Drop and recreate the function
DROP FUNCTION IF EXISTS public.is_current_user_admin();

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Step 3: Recreate all policies using the updated function

-- profiles policies
CREATE POLICY "Users can view own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Only admins can update user roles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

-- email_logs policies
CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert email logs" 
ON public.email_logs 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

-- delivery_routes policies
CREATE POLICY "Admins can view all routes" 
ON public.delivery_routes 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

-- driver_locations policies
CREATE POLICY "Admins can view all driver locations" 
ON public.driver_locations 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

-- woocommerce policies
CREATE POLICY "Admins can manage WooCommerce product mapping" 
ON public.woocommerce_product_mapping 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can manage WooCommerce category mapping" 
ON public.woocommerce_category_mapping 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can view WooCommerce sync logs" 
ON public.woocommerce_sync_logs 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert WooCommerce sync logs" 
ON public.woocommerce_sync_logs 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can view WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can delete WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR DELETE 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can manage WooCommerce order mapping" 
ON public.woocommerce_order_mapping 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can manage WooCommerce customer mapping" 
ON public.woocommerce_customer_mapping 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- order_returns policies
CREATE POLICY "Admins can manage all returns" 
ON public.order_returns 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- customer_credits policies
CREATE POLICY "Admins can manage all customer credits" 
ON public.customer_credits 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- order_sms_webhooks policies
CREATE POLICY "Admins can manage SMS webhook records" 
ON public.order_sms_webhooks 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- activity_logs policies
CREATE POLICY "Admins can view all activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

-- business_settings policies
CREATE POLICY "Admins can view business settings" 
ON public.business_settings 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can update business settings" 
ON public.business_settings 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert business settings" 
ON public.business_settings 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

-- customer_contacts policies
CREATE POLICY "Admins can manage customer contacts" 
ON public.customer_contacts 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- customer_payment_methods policies
CREATE POLICY "Admins can view all payment methods" 
ON public.customer_payment_methods 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can insert payment methods" 
ON public.customer_payment_methods 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can update payment methods" 
ON public.customer_payment_methods 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admins can delete payment methods" 
ON public.customer_payment_methods 
FOR DELETE 
TO authenticated
USING (is_current_user_admin());

-- customer_pricing_tiers policies
CREATE POLICY "Admins can manage customer pricing tiers" 
ON public.customer_pricing_tiers 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- customers policies
CREATE POLICY "Admins can manage customers" 
ON public.customers 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- delivery_photos policies
CREATE POLICY "Admins can view all photos" 
ON public.delivery_photos 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Users can view photos for their orders" 
ON public.delivery_photos 
FOR SELECT 
TO authenticated
USING (driver_id = auth.uid() OR is_current_user_admin());

-- delivery_status_updates policies
CREATE POLICY "Enable all operations for admins" 
ON public.delivery_status_updates 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Users can view updates for their orders" 
ON public.delivery_status_updates 
FOR SELECT 
TO authenticated
USING (driver_id = auth.uid() OR is_current_user_admin());

-- email_settings policies
CREATE POLICY "Admin can view email settings" 
ON public.email_settings 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admin can insert email settings" 
ON public.email_settings 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin can update email settings" 
ON public.email_settings 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

-- invoices policies
CREATE POLICY "Admins can manage all invoices" 
ON public.invoices 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- order_items policies
CREATE POLICY "Admins can manage order items" 
ON public.order_items 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- orders policies
CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- payment_settings policies
CREATE POLICY "Admin can view payment settings" 
ON public.payment_settings 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

CREATE POLICY "Admin can insert payment settings" 
ON public.payment_settings 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin can update payment settings" 
ON public.payment_settings 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

-- portal_login_attempts policies
CREATE POLICY "Admins can view login attempts" 
ON public.portal_login_attempts 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

-- pricing_tiers policies
CREATE POLICY "Admins can manage pricing tiers" 
ON public.pricing_tiers 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_attribute_values policies
CREATE POLICY "Admins can manage product attribute values" 
ON public.product_attribute_values 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_attributes policies
CREATE POLICY "Admins can manage product attributes" 
ON public.product_attributes 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_categories policies
CREATE POLICY "Admins can manage categories" 
ON public.product_categories 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_pricing policies
CREATE POLICY "Admins can manage product pricing" 
ON public.product_pricing 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_special_items policies
CREATE POLICY "Admins can manage special items" 
ON public.product_special_items 
FOR ALL 
TO authenticated
USING (is_current_user_admin());

-- product_specials policies
CREATE POLICY "Admins can manage product specials" 
ON public.product_specials 
FOR ALL 
TO authenticated
USING (is_current_user_admin());