
-- Create WooCommerce sync settings table
CREATE TABLE public.woocommerce_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  sync_direction TEXT NOT NULL DEFAULT 'wc_to_local' CHECK (sync_direction IN ('wc_to_local', 'local_to_wc', 'bidirectional')),
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_frequency TEXT NOT NULL DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', 'daily')),
  sync_categories BOOLEAN NOT NULL DEFAULT true,
  sync_images BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_pricing BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create product mapping table
CREATE TABLE public.woocommerce_product_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  woocommerce_product_id INTEGER NOT NULL,
  woocommerce_sku TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'error')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_wc_modified TIMESTAMP WITH TIME ZONE,
  last_local_modified TIMESTAMP WITH TIME ZONE,
  sync_errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(local_product_id),
  UNIQUE(woocommerce_product_id)
);

-- Create category mapping table
CREATE TABLE public.woocommerce_category_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local_category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  woocommerce_category_id INTEGER NOT NULL,
  woocommerce_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(local_category_id),
  UNIQUE(woocommerce_category_id)
);

-- Create sync logs table
CREATE TABLE public.woocommerce_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  direction TEXT NOT NULL CHECK (direction IN ('wc_to_local', 'local_to_wc')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
  products_processed INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  categories_processed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  triggered_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies
ALTER TABLE public.woocommerce_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_product_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_category_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for woocommerce_sync_settings
CREATE POLICY "Admins can manage WooCommerce sync settings" 
  ON public.woocommerce_sync_settings 
  FOR ALL 
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policies for woocommerce_product_mapping
CREATE POLICY "Admins can manage WooCommerce product mapping" 
  ON public.woocommerce_product_mapping 
  FOR ALL 
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policies for woocommerce_category_mapping
CREATE POLICY "Admins can manage WooCommerce category mapping" 
  ON public.woocommerce_category_mapping 
  FOR ALL 
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policies for woocommerce_sync_logs
CREATE POLICY "Admins can view WooCommerce sync logs" 
  ON public.woocommerce_sync_logs 
  FOR SELECT 
  USING (is_current_user_admin());

CREATE POLICY "Admins can insert WooCommerce sync logs" 
  ON public.woocommerce_sync_logs 
  FOR INSERT 
  WITH CHECK (is_current_user_admin());
