-- Phase 1B: Multi-Tenant Portal System - Database Foundation

-- 1. Create user_roles table (SECURITY CRITICAL - separate from profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Add portal & store fields to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_portal_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_slug TEXT UNIQUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_settings JSONB DEFAULT '{}';

-- Create index for store_slug lookups
CREATE INDEX IF NOT EXISTS idx_customers_store_slug ON public.customers(store_slug) WHERE store_slug IS NOT NULL;

-- 3. Create customer_stores table for storefront configurations
CREATE TABLE IF NOT EXISTS public.customer_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  custom_message TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on customer_stores
ALTER TABLE public.customer_stores ENABLE ROW LEVEL SECURITY;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_customer_stores_slug ON public.customer_stores(slug) WHERE is_active = true;

-- 4. Add order tracking fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS placed_via TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS storefront_customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS end_customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS end_customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS end_customer_email TEXT;

-- Create index for storefront order lookups
CREATE INDEX IF NOT EXISTS idx_orders_storefront_customer ON public.orders(storefront_customer_id) WHERE storefront_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_placed_via ON public.orders(placed_via) WHERE placed_via IS NOT NULL;

-- Add check constraint for placed_via
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_placed_via_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_placed_via_check 
  CHECK (placed_via IN ('admin', 'portal', 'storefront'));

-- 5. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create helper function to get customer_id from user
CREATE OR REPLACE FUNCTION public.get_customer_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'account_customer'
  LIMIT 1
$$;

-- 7. Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Create RLS policies for orders table (account customer access)
DROP POLICY IF EXISTS "Account customers view own orders" ON public.orders;
CREATE POLICY "Account customers view own orders"
ON public.orders FOR SELECT
USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
  OR storefront_customer_id = public.get_customer_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Account customers create orders" ON public.orders;
CREATE POLICY "Account customers create orders"
ON public.orders FOR INSERT
WITH CHECK (
  customer_id = public.get_customer_id_for_user(auth.uid())
  OR storefront_customer_id = public.get_customer_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Account customers update requested" ON public.orders;
CREATE POLICY "Account customers update requested"
ON public.orders FOR UPDATE
USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
  AND status = 'requested'
);

-- 9. Create RLS policies for customer_stores table
DROP POLICY IF EXISTS "Account customers view own store" ON public.customer_stores;
CREATE POLICY "Account customers view own store"
ON public.customer_stores FOR SELECT
USING (
  customer_id = public.get_customer_id_for_user(auth.uid())
  OR is_active = true
);

DROP POLICY IF EXISTS "Admins manage stores" ON public.customer_stores;
CREATE POLICY "Admins manage stores"
ON public.customer_stores FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Create trigger for auto-updating timestamps on user_roles
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Create trigger for auto-updating timestamps on customer_stores
DROP TRIGGER IF EXISTS update_customer_stores_updated_at ON public.customer_stores;
CREATE TRIGGER update_customer_stores_updated_at
    BEFORE UPDATE ON public.customer_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Create helper function for store slug generation
CREATE OR REPLACE FUNCTION public.generate_store_slug(business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Handle empty slug
  IF base_slug = '' THEN
    base_slug := 'store';
  END IF;
  
  final_slug := base_slug;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.customer_stores WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- 13. Create function to auto-generate store when portal access is enabled
CREATE OR REPLACE FUNCTION public.auto_create_customer_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create store if portal access is enabled and store doesn't exist
  IF NEW.portal_access_enabled = true 
     AND (OLD IS NULL OR OLD.portal_access_enabled = false)
     AND NEW.customer_type = 'account'
     AND NOT EXISTS (SELECT 1 FROM public.customer_stores WHERE customer_id = NEW.id) THEN
    
    -- Generate slug from company_name or business_name
    INSERT INTO public.customer_stores (
      customer_id,
      slug,
      display_name,
      is_active,
      contact_email,
      contact_phone
    ) VALUES (
      NEW.id,
      public.generate_store_slug(COALESCE(NEW.company_name, NEW.business_name, NEW.first_name || ' ' || NEW.last_name)),
      COALESCE(NEW.company_name, NEW.business_name, NEW.first_name || ' ' || NEW.last_name),
      COALESCE(NEW.store_enabled, false),
      NEW.email,
      NEW.phone
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create store (supports both INSERT and UPDATE)
DROP TRIGGER IF EXISTS trigger_auto_create_customer_store ON public.customers;
CREATE TRIGGER trigger_auto_create_customer_store
  AFTER INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_customer_store();