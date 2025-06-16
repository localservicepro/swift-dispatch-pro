
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
    console.log('=== VERIFICATION REQUEST ===')
    console.log('Session ID:', sessionId)
    console.log('Invoice ID:', invoiceId)

    // Retrieve the checkout session from Stripe
    console.log('Retrieving Stripe session...')
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log('=== STRIPE SESSION DETAILS ===')
    console.log('Payment Status:', session.payment_status)
    console.log('Session Metadata:', session.metadata)
    console.log('Payment Intent:', session.payment_intent)
    
    if (session.payment_status === 'paid') {
      console.log('✅ PAYMENT CONFIRMED - Starting database updates...')

      // First, update invoice status to paid
      console.log('Updating invoice status...')
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (invoiceUpdateError) {
        console.error('❌ Error updating invoice status:', invoiceUpdateError)
        throw new Error('Failed to update invoice status')
      }
      console.log('✅ Invoice status updated to PAID')

      // Get order ID from session metadata or invoice record
      let orderId = session.metadata?.order_id
      console.log('Order ID from session metadata:', orderId)

      if (!orderId) {
        console.log('No order ID in metadata, fetching from invoice...')
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('order_id')
          .eq('id', invoiceId)
          .single()

        if (invoiceError) {
          console.error('❌ Error fetching invoice for order ID:', invoiceError)
          throw new Error('Failed to get order ID from invoice')
        }

        orderId = invoiceData?.order_id
        console.log('Order ID from invoice record:', orderId)
      }

      if (orderId) {
        console.log('Updating order payment status...')
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            payment_method: 'stripe'
          })
          .eq('id', orderId)

        if (orderUpdateError) {
          console.error('❌ Error updating order payment status:', orderUpdateError)
          // Don't throw error, just log it - invoice update was successful
        } else {
          console.log('✅ Order payment status updated to PAID')
        }
      } else {
        console.warn('⚠️ No order ID found - skipping order update')
      }

      console.log('=== PAYMENT VERIFICATION COMPLETED SUCCESSFULLY ===')

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'paid',
          message: 'Payment verified and statuses updated successfully',
          orderId: orderId || null,
          invoiceId: invoiceId,
          sessionId: sessionId
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
      console.log('❌ Payment not completed, status:', session.payment_status)
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: `Payment not completed. Current status: ${session.payment_status}`,
          sessionId: sessionId,
          invoiceId: invoiceId
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
    console.error('=== ERROR in verify-invoice-payment ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to verify payment',
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
