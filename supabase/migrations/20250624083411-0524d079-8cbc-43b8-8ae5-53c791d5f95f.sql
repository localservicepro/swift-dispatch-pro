
-- Add Stripe configuration columns to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN stripe_test_publishable_key TEXT,
ADD COLUMN stripe_test_secret_key TEXT,
ADD COLUMN stripe_live_publishable_key TEXT, 
ADD COLUMN stripe_live_secret_key TEXT,
ADD COLUMN stripe_mode TEXT NOT NULL DEFAULT 'test',
ADD COLUMN stripe_webhook_secret TEXT,
ADD COLUMN stripe_connection_status TEXT NOT NULL DEFAULT 'not_configured',
ADD COLUMN stripe_last_tested_at TIMESTAMP WITH TIME ZONE;

-- Add constraint to ensure stripe_mode is either 'test' or 'live'
ALTER TABLE public.payment_settings 
ADD CONSTRAINT check_stripe_mode CHECK (stripe_mode IN ('test', 'live'));

-- Add constraint to ensure stripe_connection_status is valid
ALTER TABLE public.payment_settings 
ADD CONSTRAINT check_stripe_connection_status CHECK (stripe_connection_status IN ('not_configured', 'connected', 'error', 'testing'));
