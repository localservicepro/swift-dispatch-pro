
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
    console.log('=== Starting Invoice Payment Session Creation ===')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      throw new Error('Missing required Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { invoiceId }: InvoicePaymentRequest = await req.json()
    console.log('Processing payment for invoice:', invoiceId)

    // Step 1: Get payment settings first
    console.log('Step 1: Fetching payment settings...')
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Payment settings fetch error:', settingsError)
      throw new Error('Payment settings not configured. Please configure payment settings first.')
    }

    console.log('Payment settings found:', {
      currency: paymentSettings.currency,
      stripeMode: paymentSettings.stripe_mode,
      hasTestKey: !!paymentSettings.stripe_test_secret_key,
      hasLiveKey: !!paymentSettings.stripe_live_secret_key
    })

    // Step 2: Get the appropriate Stripe key
    const isLiveMode = paymentSettings.stripe_mode === 'live'
    const stripeSecretKey = isLiveMode 
      ? paymentSettings.stripe_live_secret_key 
      : paymentSettings.stripe_test_secret_key

    if (!stripeSecretKey) {
      console.error('Stripe secret key not found for mode:', paymentSettings.stripe_mode)
      throw new Error(`Stripe ${paymentSettings.stripe_mode} secret key not configured in payment settings`)
    }

    console.log('Using Stripe in mode:', paymentSettings.stripe_mode)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    // Step 3: Get invoice details (simplified query)
    console.log('Step 2: Fetching invoice details...')
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
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      orderId: invoice.order_id,
      isBatch: invoice.is_batch_invoice,
      customerEmail: invoice.customer_email
    })

    // Step 4: Validate invoice status
    if (invoice.status !== 'pending') {
      console.error('Invoice status is not pending:', invoice.status)
      throw new Error('Invoice is not available for payment')
    }

    // Step 5: Use payment settings currency as default, fallback to invoice currency
    const finalCurrency = paymentSettings.currency || invoice.currency || 'AUD'
    console.log('Currency determination:', {
      paymentSettingsCurrency: paymentSettings.currency,
      invoiceCurrency: invoice.currency,
      finalCurrency
    })

    // Step 6: Get order details if needed for customer information
    console.log('Step 3: Fetching order details for customer info...')
    let customerEmail = invoice.customer_email
    let orderDetails = null

    if (invoice.order_id) {
      console.log('Fetching single order details for order_id:', invoice.order_id)
      const { data: singleOrder, error: singleOrderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_address,
          products,
          customer_id
        `)
        .eq('id', invoice.order_id)
        .single()

      if (singleOrderError) {
        console.error('Single order fetch error:', singleOrderError)
      } else {
        orderDetails = singleOrder
        console.log('Single order found:', {
          orderNumber: orderDetails.order_number,
          customerName: orderDetails.customer_name,
          customerId: orderDetails.customer_id
        })

        // Try to get customer email from customers table if we have customer_id
        if (orderDetails.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('email')
            .eq('id', orderDetails.customer_id)
            .single()

          if (!customerError && customer?.email) {
            customerEmail = customer.email
            console.log('Using customer email from customers table:', customerEmail)
          }
        }
      }
    } else if (invoice.is_batch_invoice && invoice.related_order_ids) {
      console.log('Fetching batch order details...')
      const orderIds = Array.isArray(invoice.related_order_ids) 
        ? invoice.related_order_ids 
        : JSON.parse(invoice.related_order_ids || '[]')
      
      console.log('Batch order IDs:', orderIds)
      
      if (orderIds.length > 0) {
        const { data: batchOrders, error: batchOrderError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_name,
            customer_address,
            products,
            customer_id
          `)
          .in('id', orderIds)

        if (batchOrderError) {
          console.error('Batch orders fetch error:', batchOrderError)
        } else {
          orderDetails = batchOrders?.[0] || null
          console.log('Batch orders found:', {
            count: batchOrders?.length,
            firstOrderNumber: orderDetails?.order_number,
            customerId: orderDetails?.customer_id
          })

          // Try to get customer email from customers table if we have customer_id
          if (orderDetails?.customer_id) {
            const { data: customer, error: customerError } = await supabase
              .from('customers')
              .select('email')
              .eq('id', orderDetails.customer_id)
              .single()

            if (!customerError && customer?.email) {
              customerEmail = customer.email
              console.log('Using customer email from customers table for batch:', customerEmail)
            }
          }
        }
      }
    }

    // Step 7: Validate customer email
    console.log('Step 4: Validating customer email...')
    console.log('Customer email validation:', {
      invoiceEmail: invoice.customer_email,
      finalEmail: customerEmail,
      hasOrderDetails: !!orderDetails
    })

    if (!customerEmail || !customerEmail.includes('@') || customerEmail.includes('unknown')) {
      console.error('Invalid customer email:', customerEmail)
      throw new Error('Valid customer email is required for payment processing. Please ensure the customer has a valid email address.')
    }

    // Step 8: Validate invoice amount
    if (!invoice.amount || invoice.amount <= 0) {
      console.error('Invalid invoice amount:', invoice.amount)
      throw new Error('Invoice amount must be greater than zero')
    }

    // Step 9: Create product description
    let productDescription = `Payment for Invoice ${invoice.invoice_number}`
    if (orderDetails) {
      if (invoice.is_batch_invoice) {
        productDescription = `Batch Invoice ${invoice.invoice_number} - Multiple Orders`
      } else {
        productDescription = `Invoice ${invoice.invoice_number} - Order ${orderDetails.order_number}`
      }
    }

    console.log('Step 5: Creating Stripe checkout session...')
    console.log('Stripe session parameters:', {
      currency: finalCurrency.toLowerCase(),
      amount: invoice.amount,
      amountInCents: Math.round(invoice.amount * 100),
      customerEmail,
      productDescription
    })

    // Step 10: Create Stripe checkout session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: finalCurrency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: productDescription,
            },
            unit_amount: Math.round(invoice.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment' as const,
      success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice.id}`,
      cancel_url: `${req.headers.get('origin')}/payment-cancelled?invoice_id=${invoice.id}`,
      customer_email: customerEmail,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id || '',
        is_batch_invoice: invoice.is_batch_invoice ? 'true' : 'false',
      },
    }

    console.log('Creating Stripe session with config:', {
      ...sessionConfig,
      line_items: sessionConfig.line_items.map(item => ({
        ...item,
        price_data: {
          ...item.price_data,
          unit_amount: item.price_data.unit_amount
        }
      }))
    })

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log('Stripe session created successfully:', {
      sessionId: session.id,
      sessionUrl: session.url,
      metadata: session.metadata,
      customerEmail: session.customer_email
    })

    // Step 11: Update invoice with payment URL and session ID
    console.log('Step 6: Updating invoice with payment details...')
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        payment_url: session.url,
        stripe_payment_intent_id: session.id,
        currency: finalCurrency // Ensure currency is consistent
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice with payment details:', updateError)
      throw new Error('Failed to update invoice with payment information')
    }

    console.log('=== Invoice Payment Session Created Successfully ===')
    console.log('Final result:', {
      sessionId: session.id,
      paymentUrl: session.url,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      currency: finalCurrency
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId: session.id,
        paymentUrl: session.url,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number
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
    console.error('=== ERROR in create-invoice-payment ===')
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      type: error.type
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment session',
        details: error.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
