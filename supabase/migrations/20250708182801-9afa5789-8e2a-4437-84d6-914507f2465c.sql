-- Add WooCommerce order sync support

-- Create WooCommerce order mapping table
CREATE TABLE public.woocommerce_order_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  woocommerce_order_id INTEGER NOT NULL UNIQUE,
  local_order_id UUID NOT NULL,
  woocommerce_order_number TEXT,
  last_wc_modified TIMESTAMP WITH TIME ZONE,
  last_local_modified TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (local_order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Create WooCommerce customer mapping table
CREATE TABLE public.woocommerce_customer_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  woocommerce_customer_id INTEGER NOT NULL UNIQUE,
  local_customer_id UUID NOT NULL,
  woocommerce_email TEXT,
  last_wc_modified TIMESTAMP WITH TIME ZONE,
  last_local_modified TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (local_customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

-- Add order sync settings to woocommerce_sync_settings
ALTER TABLE public.woocommerce_sync_settings 
ADD COLUMN IF NOT EXISTS sync_orders BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_customers BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS order_sync_direction TEXT DEFAULT 'wc_to_local',
ADD COLUMN IF NOT EXISTS order_status_mapping JSONB DEFAULT '{
  "pending": "preparing",
  "processing": "preparing", 
  "on-hold": "on_hold",
  "completed": "delivered",
  "cancelled": "cancelled",
  "refunded": "cancelled",
  "failed": "cancelled"
}'::jsonb,
ADD COLUMN IF NOT EXISTS customer_sync_mode TEXT DEFAULT 'create_update',
ADD COLUMN IF NOT EXISTS order_date_filter TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS order_date_from DATE,
ADD COLUMN IF NOT EXISTS order_date_to DATE;

-- Update sync logs to include order sync statistics
ALTER TABLE public.woocommerce_sync_logs 
ADD COLUMN IF NOT EXISTS orders_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orders_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orders_updated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS orders_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customers_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customers_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customers_updated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customers_failed INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.woocommerce_order_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_customer_mapping ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order mapping
CREATE POLICY "Admins can manage WooCommerce order mapping" 
ON public.woocommerce_order_mapping 
FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Create RLS policies for customer mapping  
CREATE POLICY "Admins can manage WooCommerce customer mapping" 
ON public.woocommerce_customer_mapping 
FOR ALL
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_woocommerce_order_mapping_wc_id ON public.woocommerce_order_mapping(woocommerce_order_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_order_mapping_local_id ON public.woocommerce_order_mapping(local_order_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_customer_mapping_wc_id ON public.woocommerce_customer_mapping(woocommerce_customer_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_customer_mapping_local_id ON public.woocommerce_customer_mapping(local_customer_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_customer_mapping_email ON public.woocommerce_customer_mapping(woocommerce_email);