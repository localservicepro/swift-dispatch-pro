-- Add Stripe configuration fields to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN IF NOT EXISTS stripe_test_publishable_key text,
ADD COLUMN IF NOT EXISTS stripe_test_secret_key text,
ADD COLUMN IF NOT EXISTS stripe_live_publishable_key text,
ADD COLUMN IF NOT EXISTS stripe_live_secret_key text,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret text,
ADD COLUMN IF NOT EXISTS stripe_mode text NOT NULL DEFAULT 'test',
ADD COLUMN IF NOT EXISTS stripe_connection_status text NOT NULL DEFAULT 'not_configured',
ADD COLUMN IF NOT EXISTS stripe_last_tested_at timestamp with time zone;

-- Create function to test Stripe connection
CREATE OR REPLACE FUNCTION test_stripe_connection(
  api_key text,
  is_live boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Basic validation of API key format
  IF api_key IS NULL OR api_key = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'API key is required'
    );
  END IF;
  
  -- Check if key format matches expected Stripe format
  IF is_live THEN
    IF NOT api_key LIKE 'sk_live_%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Live secret key must start with sk_live_'
      );
    END IF;
  ELSE
    IF NOT api_key LIKE 'sk_test_%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Test secret key must start with sk_test_'
      );
    END IF;
  END IF;
  
  -- Update connection status and test timestamp
  UPDATE public.payment_settings 
  SET 
    stripe_connection_status = 'testing',
    stripe_last_tested_at = now()
  WHERE id = (SELECT id FROM public.payment_settings LIMIT 1);
  
  -- Return success for now (actual Stripe API test will be done in edge function)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'API key format is valid'
  );
END;
$$;

-- Create function to get current Stripe settings (without exposing secret keys)
CREATE OR REPLACE FUNCTION get_stripe_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings record;
  result jsonb;
BEGIN
  SELECT 
    stripe_mode,
    stripe_connection_status,
    stripe_last_tested_at,
    CASE 
      WHEN stripe_test_publishable_key IS NOT NULL 
      THEN 'pk_test_****' || RIGHT(stripe_test_publishable_key, 4)
      ELSE NULL 
    END as test_publishable_key_masked,
    CASE 
      WHEN stripe_test_secret_key IS NOT NULL 
      THEN 'sk_test_****' || RIGHT(stripe_test_secret_key, 4)
      ELSE NULL 
    END as test_secret_key_masked,
    CASE 
      WHEN stripe_live_publishable_key IS NOT NULL 
      THEN 'pk_live_****' || RIGHT(stripe_live_publishable_key, 4)
      ELSE NULL 
    END as live_publishable_key_masked,
    CASE 
      WHEN stripe_live_secret_key IS NOT NULL 
      THEN 'sk_live_****' || RIGHT(stripe_live_secret_key, 4)
      ELSE NULL 
    END as live_secret_key_masked,
    CASE 
      WHEN stripe_webhook_secret IS NOT NULL 
      THEN 'whsec_****' || RIGHT(stripe_webhook_secret, 4)
      ELSE NULL 
    END as webhook_secret_masked
  INTO settings
  FROM public.payment_settings 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'stripe_mode', 'test',
      'stripe_connection_status', 'not_configured'
    );
  END IF;
  
  result := jsonb_build_object(
    'stripe_mode', settings.stripe_mode,
    'stripe_connection_status', settings.stripe_connection_status,
    'stripe_last_tested_at', settings.stripe_last_tested_at,
    'test_publishable_key_masked', settings.test_publishable_key_masked,
    'test_secret_key_masked', settings.test_secret_key_masked,
    'live_publishable_key_masked', settings.live_publishable_key_masked,
    'live_secret_key_masked', settings.live_secret_key_masked,
    'webhook_secret_masked', settings.webhook_secret_masked
  );
  
  RETURN result;
END;
$$;