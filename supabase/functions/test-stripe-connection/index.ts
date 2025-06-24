
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConnectionRequest {
  publishableKey: string
  secretKey: string
  mode: 'test' | 'live'
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Testing Stripe connection...')
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Parse request body
    const { publishableKey, secretKey, mode }: TestConnectionRequest = await req.json()

    if (!publishableKey || !secretKey) {
      throw new Error('Missing Stripe API keys')
    }

    // Validate key format
    const expectedPrefix = mode === 'test' ? 'pk_test_' : 'pk_live_'
    const expectedSecretPrefix = mode === 'test' ? 'sk_test_' : 'sk_live_'

    if (!publishableKey.startsWith(expectedPrefix)) {
      throw new Error(`Invalid publishable key format for ${mode} mode`)
    }

    if (!secretKey.startsWith(expectedSecretPrefix)) {
      throw new Error(`Invalid secret key format for ${mode} mode`)
    }

    console.log(`Testing ${mode} mode Stripe connection...`)

    // Initialize Stripe with the provided secret key
    const stripe = new Stripe(secretKey, { 
      apiVersion: '2024-06-20',
      typescript: true
    })

    // Test the connection by retrieving account information
    const account = await stripe.accounts.retrieve()
    console.log('Stripe account retrieved successfully:', account.id)

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update connection status in database
    const { error: updateError } = await supabase
      .from('payment_settings')
      .update({ 
        stripe_connection_status: 'connected',
        stripe_last_tested_at: new Date().toISOString()
      })
      .eq('id', (await supabase.from('payment_settings').select('id').single()).data?.id)

    if (updateError) {
      console.error('Failed to update connection status:', updateError)
      // Don't fail the entire operation if database update fails
    }

    console.log('Stripe connection test completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountId: account.id,
        businessProfile: account.business_profile?.name || 'N/A',
        country: account.country,
        mode: mode
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
    console.error('Stripe connection test failed:', error)

    // Try to update database with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('payment_settings')
          .update({ 
            stripe_connection_status: 'error',
            stripe_last_tested_at: new Date().toISOString()
          })
          .eq('id', (await supabase.from('payment_settings').select('id').single()).data?.id)
      }
    } catch (dbError) {
      console.error('Failed to update error status in database:', dbError)
    }

    // Determine appropriate status code and error message
    let statusCode = 400
    let errorMessage = error.message || 'Connection test failed'

    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Invalid Stripe API key'
    } else if (error.type === 'StripePermissionError') {
      errorMessage = 'Insufficient permissions for this Stripe key'
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Unable to connect to Stripe'
      statusCode = 503
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        type: error.type || 'unknown_error'
      }),
      {
        status: statusCode,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    )
  }
}

serve(handler)
