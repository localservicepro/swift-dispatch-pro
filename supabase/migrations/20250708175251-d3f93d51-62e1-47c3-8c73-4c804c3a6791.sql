-- Add missing columns to existing tables
ALTER TABLE public.woocommerce_sync_logs 
ADD COLUMN IF NOT EXISTS settings_id UUID REFERENCES public.woocommerce_sync_settings(id);

-- Add missing columns to sync logs
ALTER TABLE public.woocommerce_sync_logs 
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.woocommerce_sync_logs 
ADD COLUMN IF NOT EXISTS triggered_by UUID;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_logs_settings_id ON public.woocommerce_sync_logs(settings_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_sync_logs_started_at ON public.woocommerce_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_woocommerce_product_mapping_wc_id ON public.woocommerce_product_mapping(woocommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_product_mapping_local_id ON public.woocommerce_product_mapping(local_product_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_category_mapping_wc_id ON public.woocommerce_category_mapping(woocommerce_category_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_category_mapping_local_id ON public.woocommerce_category_mapping(local_category_id);