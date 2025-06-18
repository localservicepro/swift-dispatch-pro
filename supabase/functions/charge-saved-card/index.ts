
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerId, amount, currency = 'usd', orderNumber, description } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Get customer's default payment method
    const { data: paymentMethod, error: pmError } = await supabaseClient
      .from('customer_payment_methods')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (pmError || !paymentMethod) {
      throw new Error('No default payment method found')
    }

    // Create payment intent with the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: paymentMethod.stripe_customer_id,
      payment_method: paymentMethod.stripe_payment_method_id,
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      metadata: {
        order_number: orderNumber,
        customer_id: customerId,
      },
      description: description || `Order ${orderNumber}`,
    })

    if (paymentIntent.status === 'succeeded') {
      return new Response(
        JSON.stringify({
          success: true,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`)
    }
  } catch (error) {
    console.error('Error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return new Response(
        JSON.stringify({ 
          error: 'Card was declined',
          decline_code: error.decline_code,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
