-- Add unique index for portal PINs (hashed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_portal_pin_unique 
  ON public.customers(portal_access_pin) 
  WHERE portal_access_pin IS NOT NULL AND pin_enabled = true;

-- Add index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_customers_pin_enabled 
  ON public.customers(pin_enabled, portal_access_enabled) 
  WHERE pin_enabled = true;

-- Add constraint to ensure PIN is always hashed (64 char hex for SHA-256)
ALTER TABLE public.customers 
  DROP CONSTRAINT IF EXISTS chk_portal_pin_format;

ALTER TABLE public.customers 
  ADD CONSTRAINT chk_portal_pin_format 
  CHECK (
    portal_access_pin IS NULL OR 
    (portal_access_pin ~ '^[a-f0-9]{64}$' AND length(portal_access_pin) = 64)
  );

COMMENT ON CONSTRAINT chk_portal_pin_format ON public.customers IS 
  'Ensures portal_access_pin is a valid SHA-256 hash (64 hex characters)';