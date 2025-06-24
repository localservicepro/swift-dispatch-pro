
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncKeysRequest {
  stripe_test_publishable_key?: string
  stripe_test_secret_key?: string
  stripe_live_publishable_key?: string
  stripe_live_secret_key?: string
  stripe_webhook_secret?: string
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Stripe Keys Sync Started ===')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Parse request body
    const requestBody: SyncKeysRequest = await req.json()
    console.log('Syncing Stripe keys to edge function secrets...')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create a map of keys to sync to edge function secrets
    const secretsToSync: Record<string, string> = {}

    if (requestBody.stripe_test_publishable_key) {
      secretsToSync['STRIPE_TEST_PUBLISHABLE_KEY'] = requestBody.stripe_test_publishable_key
    }
    if (requestBody.stripe_test_secret_key) {
      secretsToSync['STRIPE_TEST_SECRET_KEY'] = requestBody.stripe_test_secret_key
    }
    if (requestBody.stripe_live_publishable_key) {
      secretsToSync['STRIPE_LIVE_PUBLISHABLE_KEY'] = requestBody.stripe_live_publishable_key
    }
    if (requestBody.stripe_live_secret_key) {
      secretsToSync['STRIPE_LIVE_SECRET_KEY'] = requestBody.stripe_live_secret_key
    }
    if (requestBody.stripe_webhook_secret) {
      secretsToSync['STRIPE_WEBHOOK_SECRET'] = requestBody.stripe_webhook_secret
    }

    console.log('Keys to sync:', Object.keys(secretsToSync))

    // Store keys in a temporary table for edge functions to access
    // This is a workaround until full Management API integration is available
    const { error: upsertError } = await supabase
      .from('payment_settings')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001', // Fixed UUID for singleton pattern
        stripe_test_publishable_key: requestBody.stripe_test_publishable_key,
        stripe_test_secret_key: requestBody.stripe_test_secret_key,
        stripe_live_publishable_key: requestBody.stripe_live_publishable_key,
        stripe_live_secret_key: requestBody.stripe_live_secret_key,
        stripe_webhook_secret: requestBody.stripe_webhook_secret,
        stripe_connection_status: 'connected',
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Error storing keys in database:', upsertError)
      throw new Error(`Failed to store keys: ${upsertError.message}`)
    }

    console.log('Keys synchronized successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Stripe keys synced successfully',
        syncedKeys: Object.keys(secretsToSync)
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )

  } catch (error: any) {
    console.error('Error syncing Stripe keys:', error)

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to sync Stripe keys'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    )
  }
}

serve(handler)
