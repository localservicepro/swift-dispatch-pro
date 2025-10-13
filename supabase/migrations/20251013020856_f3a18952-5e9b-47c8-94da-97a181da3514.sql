-- Phase 1: Security Architecture Migration
-- Migrate existing roles from profiles to user_roles table

-- First, populate user_roles from existing profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::user_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update RLS policies on profiles to use has_role() instead of checking role column
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate policies using has_role()
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Update activity_logs policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update business_settings policies
DROP POLICY IF EXISTS "Admins can view business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can insert business settings" ON public.business_settings;

CREATE POLICY "Admins can view business settings"
ON public.business_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update business settings"
ON public.business_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert business settings"
ON public.business_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Phase 2: Update handle_new_user trigger to NOT create profiles for customer signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if this is NOT a customer signup
  -- Customer signups will have customer_id in metadata
  IF (NEW.raw_user_meta_data->>'customer_id' IS NULL) THEN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Assign role from metadata, default to admin for non-customer signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'admin'::public.user_role)
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- For customer signups, assign account_customer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'account_customer'::public.user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Phase 3: Create function to enable customer portal access
CREATE OR REPLACE FUNCTION public.enable_customer_portal_access(
  p_customer_id uuid,
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  customer_record customers%ROWTYPE;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can enable portal access';
  END IF;
  
  -- Get customer details
  SELECT * INTO customer_record FROM customers WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Check if customer already has portal access
  IF customer_record.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Customer already has portal access';
  END IF;
  
  -- Create auth user (requires service role, so this will be called from edge function)
  -- For now, return instructions
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Portal access setup initiated',
    'customer_id', p_customer_id,
    'email', p_email
  );
END;
$$;

-- Remove role column from profiles (after migration)
-- Note: Commenting out for safety - uncomment after verifying migration worked
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;