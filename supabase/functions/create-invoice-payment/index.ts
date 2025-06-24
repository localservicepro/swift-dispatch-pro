
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

// Helper function to get Stripe keys from environment secrets
function getStripeKeysFromSecrets(mode: 'test' | 'live') {
  const secretKeyEnvName = mode === 'test' ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY'
  const publishableKeyEnvName = mode === 'test' ? 'STRIPE_TEST_PUBLISHABLE_KEY' : 'STRIPE_LIVE_PUBLISHABLE_KEY'
  
  return {
    secretKey: Deno.env.get(secretKeyEnvName),
    publishableKey: Deno.env.get(publishableKeyEnvName)
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Creating invoice payment session...')
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error: Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    })

    // Get payment settings to determine Stripe mode
    console.log('Fetching payment settings...')
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('stripe_mode, stripe_test_secret_key, stripe_live_secret_key, stripe_connection_status')
      .single()

    if (settingsError || !paymentSettings) {
      throw new Error('Payment system not configured. Please configure Stripe settings first.')
    }

    if (paymentSettings.stripe_connection_status !== 'connected') {
      throw new Error('Stripe is not properly configured. Please test and save your Stripe settings first.')
    }

    const stripeMode = paymentSettings.stripe_mode || 'test'
    console.log(`Using Stripe in ${stripeMode} mode`)

    // Get Stripe keys from edge function secrets (preferred) or fallback to database
    const secretKeys = getStripeKeysFromSecrets(stripeMode)
    const stripeSecretKey = secretKeys.secretKey || 
      (stripeMode === 'live' ? paymentSettings.stripe_live_secret_key : paymentSettings.stripe_test_secret_key)

    console.log('Key source:', secretKeys.secretKey ? 'edge function secrets' : 'database fallback')

    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe ${stripeMode} secret key. Please configure Stripe settings.`)
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, { 
      apiVersion: '2024-06-20',
      typescript: true
    })

    // Parse request and fetch invoice
    const { invoiceId } = await req.json()
    if (!invoiceId) {
      throw new Error('Invalid or missing invoiceId')
    }

    console.log('Processing payment for invoice:', invoiceId)

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, customer_email, amount, currency, status,
        due_date, is_batch_invoice, order_id, batch_invoice_type
      `)
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceError) {
      throw new Error(`Database error: ${invoiceError.message}`)
    }

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    if (invoice.status !== 'pending') {
      throw new Error(`Invoice is not available for payment. Current status: ${invoice.status}`)
    }

    if (!invoice.amount || invoice.amount <= 0) {
      throw new Error('Invalid invoice amount')
    }

    console.log('Invoice validated:', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency
    })

    // Fetch order information
    let orderData = null
    if (invoice.is_batch_invoice) {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, products')
        .eq('batch_invoice_id', invoiceId)
        .limit(1)
        .maybeSingle()
      orderData = data
    } else if (invoice.order_id) {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, products')
        .eq('id', invoice.order_id)
        .maybeSingle()
      orderData = data
    }

    if (!orderData) {
      throw new Error('Associated order not found')
    }

    // Create Stripe checkout session
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://your-domain.com'
    const currency = (invoice.currency || 'USD').toUpperCase()
    const amountInCents = Math.round(invoice.amount * 100)

    console.log('Creating Stripe session...', {
      currency: currency.toLowerCase(),
      amountInCents,
      mode: stripeMode
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: `Payment for Order ${orderData.order_number} - ${orderData.customer_name}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
      cancel_url: `${origin}/payment-cancelled?invoice_id=${invoice.id}`,
      customer_email: invoice.customer_email,
      metadata: {
        invoice_id: invoice.id,
        order_id: orderData.id,
        invoice_number: invoice.invoice_number,
        is_batch_invoice: invoice.is_batch_invoice ? 'true' : 'false',
        stripe_mode: stripeMode
      },
    })

    console.log('Stripe session created:', session.id)

    // Update invoice with payment details
    await supabase
      .from('invoices')
      .update({ 
        payment_url: session.url,
        stripe_payment_intent_id: session.id
      })
      .eq('id', invoiceId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        paymentUrl: session.url,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        mode: stripeMode,
        keySource: secretKeys.secretKey ? 'edge_function_secrets' : 'database_fallback'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('Error creating invoice payment session:', error)
    
    let statusCode = 500
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      statusCode = 400
    } else if (error.message.includes('configuration') || error.message.includes('not configured')) {
      statusCode = 503
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create payment session',
        details: error.name || 'UnknownError'
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
