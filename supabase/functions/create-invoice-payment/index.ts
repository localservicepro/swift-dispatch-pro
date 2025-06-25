
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

    // Get invoice details first
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      throw new Error('Invoice not found')
    }

    console.log('Found invoice:', invoice.invoice_number, 'with status:', invoice.status)

    if (invoice.status !== 'pending') {
      throw new Error('Invoice is not available for payment')
    }

    // Get order details with proper relationship handling
    let orderDetails = null;
    
    if (invoice.order_id) {
      // Single order invoice - use explicit relationship
      const { data: singleOrder, error: singleOrderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_address,
          products,
          customer_id,
          customers!orders_customer_id_fkey(
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('id', invoice.order_id)
        .single()

      if (singleOrderError) {
        console.error('Single order fetch error:', singleOrderError)
      } else {
        orderDetails = singleOrder
      }
    } else if (invoice.is_batch_invoice && invoice.related_order_ids) {
      // Batch invoice - get multiple orders
      const orderIds = Array.isArray(invoice.related_order_ids) 
        ? invoice.related_order_ids 
        : JSON.parse(invoice.related_order_ids || '[]')
      
      if (orderIds.length > 0) {
        const { data: batchOrders, error: batchOrderError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_name,
            customer_address,
            products,
            customer_id,
            customers!orders_customer_id_fkey(
              id,
              email,
              first_name,
              last_name
            )
          `)
          .in('id', orderIds)

        if (batchOrderError) {
          console.error('Batch orders fetch error:', batchOrderError)
        } else {
          // Use the first order for customer details
          orderDetails = batchOrders?.[0] || null
        }
      }
    }

    // Determine customer email
    let customerEmail = invoice.customer_email;
    if (orderDetails?.customers?.email) {
      customerEmail = orderDetails.customers.email;
      console.log('Using customer email from database:', customerEmail);
    }

    // Validate customer email
    if (!customerEmail || !customerEmail.includes('@')) {
      console.warn('Invalid or missing customer email:', customerEmail);
      throw new Error('Valid customer email is required for payment processing');
    }

    console.log('Creating Stripe checkout session for invoice:', invoice.invoice_number)

    // Create product description
    let productDescription = `Payment for Invoice ${invoice.invoice_number}`;
    if (orderDetails) {
      if (invoice.is_batch_invoice) {
        productDescription = `Batch Invoice ${invoice.invoice_number} - Multiple Orders`;
      } else {
        productDescription = `Invoice ${invoice.invoice_number} - Order ${orderDetails.order_number}`;
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: productDescription,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?invoice_id=${invoice.id}`,
      customer_email: customerEmail,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id || '',
        is_batch_invoice: invoice.is_batch_invoice ? 'true' : 'false',
      },
    })

    console.log('Stripe session created:', {
      sessionId: session.id,
      metadata: session.metadata,
      customerEmail: customerEmail
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
