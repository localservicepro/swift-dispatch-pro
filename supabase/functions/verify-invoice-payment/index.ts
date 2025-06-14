
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
    console.log('Verifying invoice payment...')
    
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
    
    if (session.payment_status === 'paid') {
      // Update invoice status to paid
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (invoiceUpdateError) {
        throw new Error('Failed to update invoice status')
      }

      // Update order payment status
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: 'stripe'
        })
        .eq('id', session.metadata?.order_id)

      if (orderUpdateError) {
        console.error('Error updating order payment status:', orderUpdateError)
      }

      console.log('Payment verified and statuses updated successfully')

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'paid',
          message: 'Payment verified successfully'
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
    console.error('Error verifying invoice payment:', error)
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
