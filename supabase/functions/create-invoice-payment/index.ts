
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

// Helper function to get Stripe keys with improved fallback logic
async function getStripeKeys(supabase: any, mode: 'test' | 'live') {
  console.log(`Attempting to get Stripe keys for ${mode} mode...`)
  
  // First try to get from edge function environment secrets
  const secretKeyEnvName = mode === 'test' ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY'
  const publishableKeyEnvName = mode === 'test' ? 'STRIPE_TEST_PUBLISHABLE_KEY' : 'STRIPE_LIVE_PUBLISHABLE_KEY'
  
  let secretKey = Deno.env.get(secretKeyEnvName)
  let publishableKey = Deno.env.get(publishableKeyEnvName)
  
  // Fallback to database if not found in environment
  if (!secretKey || !publishableKey) {
    console.log('Keys not found in environment, checking database...')
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('stripe_test_secret_key, stripe_live_secret_key, stripe_test_publishable_key, stripe_live_publishable_key')
      .single()

    if (paymentSettings) {
      secretKey = secretKey || (mode === 'test' ? paymentSettings.stripe_test_secret_key : paymentSettings.stripe_live_secret_key)
      publishableKey = publishableKey || (mode === 'test' ? paymentSettings.stripe_test_publishable_key : paymentSettings.stripe_live_publishable_key)
    }
  }

  console.log(`Found ${mode} keys:`, {
    secretKey: secretKey ? `${secretKey.substring(0, 12)}...` : 'NOT_FOUND',
    publishableKey: publishableKey ? `${publishableKey.substring(0, 12)}...` : 'NOT_FOUND'
  })

  return { secretKey, publishableKey }
}

// Helper function to get customer email with improved logic
async function getCustomerEmail(supabase: any, invoice: any): Promise<string> {
  console.log('Getting customer email for invoice:', invoice.id)
  
  // First check if invoice already has a valid email
  if (invoice.customer_email && 
      invoice.customer_email !== 'guest@example.com' && 
      invoice.customer_email.includes('@') && 
      !invoice.customer_email.includes('example.com')) {
    console.log('Using existing invoice email:', invoice.customer_email)
    return invoice.customer_email
  }

  // Try to get email from the related order's customer
  let customerEmail = null
  
  if (invoice.order_id) {
    console.log('Fetching customer email from order:', invoice.order_id)
    const { data: orderWithCustomer } = await supabase
      .from('orders')
      .select(`
        customer_id,
        customers!orders_customer_id_fkey(email)
      `)
      .eq('id', invoice.order_id)
      .single()

    if (orderWithCustomer?.customers?.email) {
      customerEmail = orderWithCustomer.customers.email
      console.log('Found customer email from order:', customerEmail)
    }
  }

  // If still no email, try batch invoice orders
  if (!customerEmail && invoice.is_batch_invoice) {
    console.log('Checking batch invoice orders for customer email...')
    const { data: batchOrders } = await supabase
      .from('orders')
      .select(`
        customer_id,
        customers!orders_customer_id_fkey(email)
      `)
      .eq('batch_invoice_id', invoice.id)
      .limit(1)

    if (batchOrders?.[0]?.customers?.email) {
      customerEmail = batchOrders[0].customers.email
      console.log('Found customer email from batch orders:', customerEmail)
    }
  }

  // Validate email format
  if (customerEmail && customerEmail.includes('@') && !customerEmail.includes('example.com')) {
    return customerEmail
  }

  throw new Error('No valid customer email found for invoice')
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

    // Get payment settings to determine Stripe mode and currency
    console.log('Fetching payment settings...')
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('stripe_mode, currency, stripe_connection_status')
      .single()

    if (settingsError) {
      console.error('Error fetching payment settings:', settingsError)
      throw new Error('Payment system not configured. Please configure payment settings first.')
    }

    if (!paymentSettings) {
      throw new Error('Payment settings not found. Please configure payment settings first.')
    }

    if (paymentSettings.stripe_connection_status !== 'connected') {
      throw new Error('Stripe is not properly configured. Please test and save your Stripe settings first.')
    }

    const stripeMode = paymentSettings.stripe_mode || 'test'
    const currency = (paymentSettings.currency || 'USD').toLowerCase()
    console.log(`Using Stripe in ${stripeMode} mode with currency ${currency}`)

    // Get Stripe keys
    const { secretKey, publishableKey } = await getStripeKeys(supabase, stripeMode)

    if (!secretKey) {
      throw new Error(`Missing Stripe ${stripeMode} secret key. Please configure Stripe settings.`)
    }

    // Initialize Stripe
    const stripe = new Stripe(secretKey, { 
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
      console.error('Database error fetching invoice:', invoiceError)
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
      currency: invoice.currency || currency
    })

    // Get customer email with improved error handling
    let customerEmail: string
    try {
      customerEmail = await getCustomerEmail(supabase, invoice)
    } catch (emailError) {
      console.error('Customer email error:', emailError)
      throw new Error(`Cannot create payment session: ${emailError.message}`)
    }

    // Fetch order information for session metadata
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

    // Use invoice currency or fallback to payment settings currency
    const sessionCurrency = (invoice.currency || currency).toLowerCase()
    const amountInCents = Math.round(invoice.amount * 100)

    // Create Stripe checkout session
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://your-domain.com'

    console.log('Creating Stripe session with:', {
      currency: sessionCurrency,
      amountInCents,
      customerEmail,
      mode: stripeMode
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: sessionCurrency,
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
      customer_email: customerEmail,
      metadata: {
        invoice_id: invoice.id,
        order_id: orderData.id,
        invoice_number: invoice.invoice_number,
        is_batch_invoice: invoice.is_batch_invoice ? 'true' : 'false',
        stripe_mode: stripeMode
      },
    })

    console.log('Stripe session created successfully:', session.id)

    // Update invoice with payment details
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        payment_url: session.url,
        stripe_payment_intent_id: session.id,
        customer_email: customerEmail // Update with the validated email
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice with payment details:', updateError)
      // Don't fail the request, but log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        paymentUrl: session.url,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: sessionCurrency,
        customerEmail: customerEmail,
        mode: stripeMode
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
