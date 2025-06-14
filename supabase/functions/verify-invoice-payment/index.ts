
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyPaymentRequest {
  sessionId: string
  invoiceId: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== VERIFY INVOICE PAYMENT STARTED ===')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const { sessionId, invoiceId }: VerifyPaymentRequest = await req.json()
    console.log('Verifying payment for session:', sessionId, 'invoice:', invoiceId)

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log('Stripe session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata
    })
    
    if (session.payment_status === 'paid') {
      console.log('Payment confirmed as paid, updating database...')

      // Update invoice status to paid
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (invoiceUpdateError) {
        console.error('Error updating invoice status:', invoiceUpdateError)
        throw new Error('Failed to update invoice status')
      }
      console.log('Invoice status updated to paid for invoice:', invoiceId)

      // Get order ID from session metadata or invoice record
      let orderId = session.metadata?.order_id
      console.log('Order ID from session metadata:', orderId)

      if (!orderId) {
        console.log('No order ID in metadata, fetching from invoice record...')
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('order_id')
          .eq('id', invoiceId)
          .single()

        if (invoiceError) {
          console.error('Error fetching invoice for order ID:', invoiceError)
          throw new Error('Failed to get order ID from invoice')
        }

        orderId = invoiceData?.order_id
        console.log('Order ID from invoice record:', orderId)
      }

      if (orderId) {
        // Update order payment status
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            payment_method: 'stripe'
          })
          .eq('id', orderId)

        if (orderUpdateError) {
          console.error('Error updating order payment status:', orderUpdateError)
          // Don't throw error, just log it - invoice update was successful
        } else {
          console.log('Order payment status updated to paid for order:', orderId)
        }
      } else {
        console.warn('No order ID found to update order payment status')
      }

      console.log('=== PAYMENT VERIFICATION COMPLETED SUCCESSFULLY ===')

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'paid',
          message: 'Payment verified and statuses updated successfully',
          orderId: orderId || null
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } else {
      console.log('Payment not completed, status:', session.payment_status)
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: 'Payment not completed'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  } catch (error: any) {
    console.error('=== ERROR in verify-invoice-payment ===', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to verify payment',
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
