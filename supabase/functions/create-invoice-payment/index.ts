
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
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL environment variable')
      throw new Error('Server configuration error: Missing SUPABASE_URL')
    }
    
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      throw new Error('Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable')
      throw new Error('Server configuration error: Missing STRIPE_SECRET_KEY')
    }

    console.log('Environment variables validated successfully')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Initialize Stripe with updated API version and better error handling
    let stripe: Stripe;
    try {
      stripe = new Stripe(stripeSecretKey, { 
        apiVersion: '2024-06-20',
        typescript: true
      })
      console.log('Stripe client initialized successfully')
    } catch (stripeInitError) {
      console.error('Failed to initialize Stripe client:', stripeInitError)
      throw new Error('Payment system initialization failed')
    }

    // Validate and parse request body
    let invoiceId: string;
    try {
      const requestBody = await req.json()
      invoiceId = requestBody.invoiceId
      
      if (!invoiceId || typeof invoiceId !== 'string' || invoiceId.trim() === '') {
        throw new Error('Invalid or missing invoiceId')
      }
      
      console.log('Processing payment for invoice:', invoiceId)
    } catch (parseError) {
      console.error('Request parsing error:', parseError)
      throw new Error('Invalid request format')
    }

    // Fetch invoice details with better error handling
    console.log('Fetching invoice details...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invoiceError) {
      console.error('Database error fetching invoice:', invoiceError)
      throw new Error(`Database error: ${invoiceError.message || 'Failed to fetch invoice'}`)
    }

    if (!invoice) {
      console.error('Invoice not found:', invoiceId)
      throw new Error('Invoice not found')
    }

    // Validate invoice status
    if (invoice.status !== 'pending') {
      console.error('Invoice not available for payment. Status:', invoice.status)
      throw new Error(`Invoice is not available for payment. Current status: ${invoice.status}`)
    }

    // Validate invoice amount
    if (!invoice.amount || invoice.amount <= 0) {
      console.error('Invalid invoice amount:', invoice.amount)
      throw new Error('Invalid invoice amount')
    }

    console.log('Invoice details validated:', {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      currency: invoice.currency,
      is_batch_invoice: invoice.is_batch_invoice,
      order_id: invoice.order_id,
      status: invoice.status
    })

    // Fetch order information with proper relationship handling
    let orderData = null;
    
    if (invoice.is_batch_invoice) {
      console.log('Fetching orders for batch invoice...')
      // For batch invoices, get any order that references this invoice via batch_invoice_id
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, products')
        .eq('batch_invoice_id', invoiceId)
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Database error fetching batch orders:', error)
        throw new Error(`Database error: ${error.message || 'Failed to fetch batch orders'}`)
      }
      
      orderData = data;
      console.log('Fetched batch invoice order:', { found: !!data, order_id: data?.id })
    } else {
      console.log('Fetching order for individual invoice...')
      // For individual invoices, get the order via order_id
      if (!invoice.order_id) {
        console.error('Individual invoice missing order_id:', invoice)
        throw new Error('Invoice does not have an associated order')
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, products')
        .eq('id', invoice.order_id)
        .maybeSingle()
      
      if (error) {
        console.error('Database error fetching individual order:', error)
        throw new Error(`Database error: ${error.message || 'Failed to fetch order'}`)
      }
      
      orderData = data;
      console.log('Fetched individual invoice order:', { found: !!data, order_id: data?.id })
    }

    if (!orderData) {
      console.error('No order data found for invoice:', {
        invoiceId,
        is_batch_invoice: invoice.is_batch_invoice,
        order_id: invoice.order_id
      })
      throw new Error('Associated order not found')
    }

    console.log('Order details:', {
      id: orderData.id,
      order_number: orderData.order_number,
      customer_name: orderData.customer_name
    })

    // Handle origin URL with fallback
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'https://your-domain.com'
    console.log('Using origin URL:', origin)

    // Create Stripe checkout session with comprehensive error handling
    console.log('Creating Stripe checkout session...')
    let session: Stripe.Checkout.Session;
    
    try {
      // Ensure currency is uppercase as Stripe expects
      const currency = (invoice.currency || 'USD').toUpperCase()
      const amountInCents = Math.round(invoice.amount * 100)
      
      console.log('Stripe session parameters:', {
        currency,
        amountInCents,
        customerEmail: invoice.customer_email,
        invoiceNumber: invoice.invoice_number
      })

      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(), // Stripe expects lowercase currency
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: `Payment for Order ${orderData.order_number} - ${orderData.customer_name}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
        cancel_url: `${origin}/payment-cancelled?invoice_id=${invoice.id}`,
        customer_email: invoice.customer_email,
        metadata: {
          invoice_id: invoice.id,
          order_id: orderData.id,
          invoice_number: invoice.invoice_number,
          is_batch_invoice: invoice.is_batch_invoice ? 'true' : 'false',
        },
      })

      console.log('Stripe session created successfully:', {
        sessionId: session.id,
        url: session.url,
        amount: amountInCents,
        currency: currency.toLowerCase()
      })

    } catch (stripeError: any) {
      console.error('Stripe API error:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        param: stripeError.param
      })
      
      // Provide user-friendly error messages based on Stripe error types
      if (stripeError.type === 'card_error') {
        throw new Error('Payment method error: ' + stripeError.message)
      } else if (stripeError.type === 'invalid_request_error') {
        throw new Error('Payment setup error: ' + stripeError.message)
      } else if (stripeError.type === 'api_error') {
        throw new Error('Payment service temporarily unavailable. Please try again.')
      } else if (stripeError.type === 'authentication_error') {
        throw new Error('Payment system configuration error')
      } else {
        throw new Error('Payment processing error: ' + (stripeError.message || 'Unknown error'))
      }
    }

    // Update invoice with payment URL and session ID
    console.log('Updating invoice with payment details...')
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        payment_url: session.url,
        stripe_payment_intent_id: session.id // Store session ID for tracking
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice with payment details:', updateError)
      // Don't fail the entire operation if invoice update fails
      console.warn('Continuing despite invoice update failure - session created successfully')
    } else {
      console.log('Invoice updated successfully with payment details')
    }

    console.log('Payment session creation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        paymentUrl: session.url,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount
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
    console.error('Error creating invoice payment session:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      statusCode = 400;
    } else if (error.message.includes('configuration') || error.message.includes('Missing')) {
      statusCode = 503; // Service Unavailable
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to create payment session',
        details: error.name || 'UnknownError'
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
