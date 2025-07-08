-- Create WooCommerce sync settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  sync_direction TEXT NOT NULL DEFAULT 'wc_to_local',
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_frequency TEXT NOT NULL DEFAULT 'manual',
  sync_categories BOOLEAN NOT NULL DEFAULT true,
  sync_images BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_pricing BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create WooCommerce sync logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id UUID NOT NULL REFERENCES public.woocommerce_sync_settings(id),
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  products_processed INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  categories_processed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  triggered_by UUID
);

-- Create WooCommerce product mapping table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.woocommerce_product_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  woocommerce_product_id INTEGER NOT NULL UNIQUE,
  local_product_id UUID NOT NULL REFERENCES public.products(id),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_wc_modified TIMESTAMP WITH TIME ZONE,
  last_local_modified TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_errors JSONB DEFAULT '[]'::jsonb,
  woocommerce_sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WooCommerce category mapping table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.woocommerce_category_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  woocommerce_category_id INTEGER NOT NULL UNIQUE,
  local_category_id UUID NOT NULL REFERENCES public.product_categories(id),
  woocommerce_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.woocommerce_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_product_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_category_mapping ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage WooCommerce sync settings" ON public.woocommerce_sync_settings;
DROP POLICY IF EXISTS "Admins can manage WooCommerce sync logs" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Admins can manage WooCommerce product mapping" ON public.woocommerce_product_mapping;
DROP POLICY IF EXISTS "Admins can manage WooCommerce category mapping" ON public.woocommerce_category_mapping;

-- Create RLS policies for woocommerce_sync_settings
CREATE POLICY "Admins can manage WooCommerce sync settings" ON public.woocommerce_sync_settings
  FOR ALL USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Create RLS policies for woocommerce_sync_logs
CREATE POLICY "Admins can manage WooCommerce sync logs" ON public.woocommerce_sync_logs
  FOR ALL USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Create RLS policies for woocommerce_product_mapping
CREATE POLICY "Admins can manage WooCommerce product mapping" ON public.woocommerce_product_mapping
  FOR ALL USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Create RLS policies for woocommerce_category_mapping
CREATE POLICY "Admins can manage WooCommerce category mapping" ON public.woocommerce_category_mapping
  FOR ALL USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_logs_settings_id ON public.woocommerce_sync_logs(settings_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_logs_started_at ON public.woocommerce_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_woocommerce_product_mapping_wc_id ON public.woocommerce_product_mapping(woocommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_product_mapping_local_id ON public.woocommerce_product_mapping(local_product_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_category_mapping_wc_id ON public.woocommerce_category_mapping(woocommerce_category_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_category_mapping_local_id ON public.woocommerce_category_mapping(local_category_id);