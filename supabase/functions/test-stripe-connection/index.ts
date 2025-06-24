
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
  console.log('=== Stripe Connection Test Started ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:')
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Parse request body
    let requestBody: TestConnectionRequest
    try {
      requestBody = await req.json()
      console.log('Request body parsed successfully')
      console.log('Mode:', requestBody.mode)
      console.log('Publishable key starts with:', requestBody.publishableKey?.substring(0, 12) + '...')
      console.log('Secret key starts with:', requestBody.secretKey?.substring(0, 12) + '...')
    } catch (error) {
      console.error('Failed to parse request body:', error)
      throw new Error('Invalid request body')
    }

    const { publishableKey, secretKey, mode } = requestBody

    if (!publishableKey || !secretKey) {
      console.error('Missing API keys in request')
      throw new Error('Missing Stripe API keys')
    }

    // Validate key format
    const expectedPrefix = mode === 'test' ? 'pk_test_' : 'pk_live_'
    const expectedSecretPrefix = mode === 'test' ? 'sk_test_' : 'sk_live_'

    console.log('Key validation:')
    console.log('- Expected publishable prefix:', expectedPrefix)
    console.log('- Expected secret prefix:', expectedSecretPrefix)
    console.log('- Publishable key valid:', publishableKey.startsWith(expectedPrefix))
    console.log('- Secret key valid:', secretKey.startsWith(expectedSecretPrefix))

    if (!publishableKey.startsWith(expectedPrefix)) {
      throw new Error(`Invalid publishable key format for ${mode} mode. Expected key to start with ${expectedPrefix}`)
    }

    if (!secretKey.startsWith(expectedSecretPrefix)) {
      throw new Error(`Invalid secret key format for ${mode} mode. Expected key to start with ${expectedSecretPrefix}`)
    }

    console.log(`Initializing Stripe in ${mode} mode...`)

    // Initialize Stripe with the provided secret key
    const stripe = new Stripe(secretKey, { 
      apiVersion: '2024-06-20',
      typescript: true
    })

    console.log('Stripe client initialized, testing connection...')

    // Test the connection by retrieving account information
    let account
    try {
      account = await stripe.accounts.retrieve()
      console.log('Account retrieved successfully:')
      console.log('- Account ID:', account.id)
      console.log('- Business name:', account.business_profile?.name || 'N/A')
      console.log('- Country:', account.country)
      console.log('- Charges enabled:', account.charges_enabled)
      console.log('- Payouts enabled:', account.payouts_enabled)
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError)
      console.error('Error type:', stripeError.type)
      console.error('Error code:', stripeError.code)
      console.error('Error message:', stripeError.message)
      throw stripeError
    }

    // Create Supabase client
    console.log('Creating Supabase client for database update...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update connection status in database
    try {
      const { data: settingsData, error: fetchError } = await supabase
        .from('payment_settings')
        .select('id')
        .single()

      if (fetchError) {
        console.error('Failed to fetch payment settings:', fetchError)
        throw new Error('Failed to fetch payment settings')
      }

      console.log('Updating payment settings with ID:', settingsData.id)

      const { error: updateError } = await supabase
        .from('payment_settings')
        .update({ 
          stripe_connection_status: 'connected',
          stripe_last_tested_at: new Date().toISOString()
        })
        .eq('id', settingsData.id)

      if (updateError) {
        console.error('Failed to update connection status:', updateError)
        // Don't fail the entire operation if database update fails
      } else {
        console.log('Database updated successfully')
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      // Don't fail the entire operation if database update fails
    }

    console.log('=== Stripe Connection Test Completed Successfully ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        accountId: account.id,
        businessProfile: account.business_profile?.name || 'N/A',
        country: account.country,
        mode: mode,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
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
    console.error('=== Stripe Connection Test Failed ===')
    console.error('Error details:', error)
    console.error('Error stack:', error.stack)

    // Try to update database with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        console.log('Updating database with error status...')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        const { data: settingsData } = await supabase
          .from('payment_settings')
          .select('id')
          .single()

        if (settingsData) {
          await supabase
            .from('payment_settings')
            .update({ 
              stripe_connection_status: 'error',
              stripe_last_tested_at: new Date().toISOString()
            })
            .eq('id', settingsData.id)
          console.log('Error status updated in database')
        }
      }
    } catch (dbError) {
      console.error('Failed to update error status in database:', dbError)
    }

    // Determine appropriate status code and error message
    let statusCode = 400
    let errorMessage = error.message || 'Connection test failed'

    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Invalid Stripe API key - please check your credentials'
      statusCode = 401
    } else if (error.type === 'StripePermissionError') {
      errorMessage = 'Insufficient permissions for this Stripe key'
      statusCode = 403
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Unable to connect to Stripe - please check your internet connection'
      statusCode = 503
    } else if (error.type === 'StripeRateLimitError') {
      errorMessage = 'Too many requests to Stripe - please wait and try again'
      statusCode = 429
    }

    console.log('Returning error response:', { statusCode, errorMessage })

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        type: error.type || 'unknown_error',
        details: error.message
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
