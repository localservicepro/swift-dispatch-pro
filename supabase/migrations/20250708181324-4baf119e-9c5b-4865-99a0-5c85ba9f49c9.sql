-- Create RLS policies for woocommerce_sync_settings table
-- This table currently has RLS enabled but no policies, causing all operations to be denied

-- Allow admins to view all WooCommerce sync settings
CREATE POLICY "Admins can view WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR SELECT 
USING (is_current_user_admin());

-- Allow admins to insert new WooCommerce sync settings
CREATE POLICY "Admins can insert WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR INSERT 
WITH CHECK (is_current_user_admin());

-- Allow admins to update WooCommerce sync settings
CREATE POLICY "Admins can update WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR UPDATE 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Allow admins to delete WooCommerce sync settings
CREATE POLICY "Admins can delete WooCommerce sync settings" 
ON public.woocommerce_sync_settings 
FOR DELETE 
USING (is_current_user_admin());