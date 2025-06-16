
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
    console.log('=== CREATE INVOICE PAYMENT STARTED ===')
    
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
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

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
    console.log('Order details:', {
      orderId: invoice.order_id,
      orderNumber: invoice.orders.order_number,
      customerName: invoice.orders.customer_name
    })

    // Get origin from request headers
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:3000'
    console.log('Using origin for URLs:', origin)

    // Create Stripe checkout session with proper metadata and URLs
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for Order ${invoice.orders.order_number} - ${invoice.orders.customer_name}`,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
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
        order_id: invoice.order_id,
        invoice_number: invoice.invoice_number,
        order_number: invoice.orders.order_number,
      },
    })

    console.log('Stripe session created successfully:', {
      sessionId: session.id,
      successUrl: session.success_url,
      metadata: session.metadata
    })

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

    console.log('=== INVOICE PAYMENT SESSION CREATED SUCCESSFULLY ===')

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
    console.error('=== ERROR in create-invoice-payment ===', error)
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
