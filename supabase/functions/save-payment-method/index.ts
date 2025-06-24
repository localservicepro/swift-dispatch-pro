
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to get Stripe secret key with fallback
async function getStripeSecretKey(supabase: any) {
  // Try environment secrets first
  let secretKey = Deno.env.get('STRIPE_TEST_SECRET_KEY') || 
                  Deno.env.get('STRIPE_LIVE_SECRET_KEY') || 
                  Deno.env.get('STRIPE_SECRET_KEY')

  // Fallback to database
  if (!secretKey) {
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('stripe_mode, stripe_test_secret_key, stripe_live_secret_key')
      .single()

    if (settings) {
      secretKey = settings.stripe_mode === 'live' 
        ? settings.stripe_live_secret_key 
        : settings.stripe_test_secret_key
    }
  }

  return secretKey
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerId, paymentMethodId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const stripeSecretKey = await getStripeSecretKey(supabaseClient)
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    console.log('Using Stripe secret key from configured source')

    // Get customer details
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      throw new Error('Customer not found')
    }

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (!paymentMethod.card) {
      throw new Error('Invalid payment method')
    }

    // Check if this is the first payment method for this customer
    const { data: existingMethods } = await supabaseClient
      .from('customer_payment_methods')
      .select('id')
      .eq('customer_id', customerId)
      .eq('is_active', true)

    const isFirstMethod = !existingMethods || existingMethods.length === 0

    // Save payment method to database
    const { error: saveError } = await supabaseClient
      .from('customer_payment_methods')
      .insert({
        customer_id: customerId,
        stripe_customer_id: customer.stripe_customer_id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: paymentMethod.card.brand,
        card_last_four: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        is_default: isFirstMethod, // First method becomes default
        is_active: true,
      })

    if (saveError) {
      throw new Error('Failed to save payment method')
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
      }
    )
  }
})
