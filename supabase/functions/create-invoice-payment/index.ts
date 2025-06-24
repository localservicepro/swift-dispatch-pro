
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
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const { invoiceId }: InvoicePaymentRequest = await req.json()
    console.log('Processing payment for invoice:', invoiceId)

    // First, get the invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      throw new Error('Invoice not found')
    }

    console.log('Invoice found:', {
      invoiceNumber: invoice.invoice_number,
      orderId: invoice.order_id,
      amount: invoice.amount,
      status: invoice.status
    })

    if (invoice.status !== 'pending') {
      throw new Error('Invoice is not available for payment')
    }

    // Now get the related order details
    let orderNumber = 'Unknown Order'
    if (invoice.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_number, customer_name, customer_address, products')
        .eq('id', invoice.order_id)
        .single()

      if (orderError) {
        console.error('Order fetch error:', orderError)
        console.log('Proceeding without order details')
      } else if (order) {
        orderNumber = order.order_number
        console.log('Order found:', {
          orderNumber: order.order_number,
          customerName: order.customer_name
        })
      }
    }

    console.log('Creating Stripe checkout session for invoice:', invoice.invoice_number)
    console.log('Order number to include in description:', orderNumber)

    // Create Stripe checkout session with proper metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for Order ${orderNumber}`,
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
        order_id: invoice.order_id || '',
        invoice_number: invoice.invoice_number,
      },
    })

    console.log('Stripe session created successfully:', {
      sessionId: session.id,
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

    console.log('Payment session created successfully for invoice:', invoice.invoice_number)

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
