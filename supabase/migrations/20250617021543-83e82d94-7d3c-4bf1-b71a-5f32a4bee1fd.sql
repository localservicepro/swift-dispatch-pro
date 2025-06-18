
-- Create GoHighLevel settings table
CREATE TABLE public.ghl_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT,
  location_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  
  -- Sync preferences
  auto_sync_customers BOOLEAN NOT NULL DEFAULT true,
  auto_sync_orders BOOLEAN NOT NULL DEFAULT true,
  
  -- Field mappings (stored as JSON)
  customer_field_mappings JSONB DEFAULT '{}'::jsonb,
  order_field_mappings JSONB DEFAULT '{}'::jsonb,
  
  -- Pipeline settings
  ghl_pipeline_id TEXT,
  stage_mappings JSONB DEFAULT '{}'::jsonb,
  
  last_tested_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create GHL sync logs table
CREATE TABLE public.ghl_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('customer', 'order')),
  local_record_id UUID NOT NULL,
  ghl_contact_id TEXT,
  ghl_opportunity_id TEXT,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add GHL contact IDs to customers table
ALTER TABLE public.customers 
ADD COLUMN ghl_contact_id TEXT,
ADD COLUMN last_synced_to_ghl TIMESTAMPTZ;

-- Add GHL opportunity IDs to orders table
ALTER TABLE public.orders 
ADD COLUMN ghl_opportunity_id TEXT,
ADD COLUMN last_synced_to_ghl TIMESTAMPTZ;

-- Enable RLS on GHL tables
ALTER TABLE public.ghl_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for ghl_settings (admin only)
CREATE POLICY "Admin can view GHL settings" ON public.ghl_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert GHL settings" ON public.ghl_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update GHL settings" ON public.ghl_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for ghl_sync_logs (admin can view all)
CREATE POLICY "Admin can view all GHL sync logs" ON public.ghl_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert GHL sync logs" ON public.ghl_sync_logs
  FOR INSERT WITH CHECK (true);

-- Insert default GHL settings
INSERT INTO public.ghl_settings (
  connection_status,
  auto_sync_customers,
  auto_sync_orders,
  customer_field_mappings,
  order_field_mappings,
  stage_mappings
) VALUES (
  'disconnected',
  true,
  true,
  '{"first_name": "firstName", "last_name": "lastName", "email": "email", "phone": "phone", "full_address": "address1"}'::jsonb,
  '{"order_number": "name", "total_amount": "monetaryValue", "status": "status"}'::jsonb,
  '{"requested": "new", "preparing": "contacted", "loading": "qualified", "en_route": "proposal_sent", "delivered": "closed_won"}'::jsonb
);
