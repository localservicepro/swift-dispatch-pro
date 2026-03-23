
CREATE TABLE public.google_sheets_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id TEXT,
  sheet_name TEXT NOT NULL DEFAULT 'Orders',
  service_account_email TEXT,
  connection_status TEXT NOT NULL DEFAULT 'not_configured',
  last_synced_at TIMESTAMPTZ,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_sheets_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google sheets settings"
ON public.google_sheets_settings
FOR ALL
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

INSERT INTO public.google_sheets_settings (id) VALUES (gen_random_uuid());
