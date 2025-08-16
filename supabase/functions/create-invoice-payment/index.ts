
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoicePaymentRequest {
  invoiceId: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Creating invoice payment session...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      console.error('Missing environment variables:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasStripeKey: !!stripeSecretKey
      })
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get Stripe secret key from database first, fallback to env
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('stripe_test_secret_key, stripe_live_secret_key, stripe_mode')
      .single()

    let finalStripeKey = stripeSecretKey
    
    if (settings) {
      const isLive = settings.stripe_mode === 'live'
      const dbKey = isLive ? settings.stripe_live_secret_key : settings.stripe_test_secret_key
      if (dbKey) {
        finalStripeKey = dbKey
      }
    }

    if (!finalStripeKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(finalStripeKey, { apiVersion: '2023-10-16' })

    const { invoiceId }: InvoicePaymentRequest = await req.json()
    console.log('Processing payment for invoice:', invoiceId)

    // Get invoice details with order information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!inner(
          id,
          order_number,
          customer_name,
          customer_address,
          products
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      throw new Error('Invoice not found')
    }

    if (invoice.status !== 'pending') {
      throw new Error('Invoice is not available for payment')
    }

    console.log('Creating Stripe checkout session for invoice:', invoice.invoice_number)
    console.log('Order details:', invoice.orders)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for Order ${invoice.orders.order_number}`,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?invoice_id=${invoice.id}`,
      customer_email: invoice.customer_email,
      metadata: {
        invoice_id: invoice.id,
        order_id: invoice.order_id,
        invoice_number: invoice.invoice_number,
      },
    })

    console.log('Stripe session created:', session.id)

    // Update invoice with payment URL and session ID
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        payment_url: session.url,
        stripe_payment_intent_id: session.id
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice with payment details:', updateError)
      throw new Error('Failed to update invoice with payment information')
    }

    console.log('Payment session created successfully:', session.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        paymentUrl: session.url 
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
    console.error('Error creating invoice payment:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment session',
        details: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
