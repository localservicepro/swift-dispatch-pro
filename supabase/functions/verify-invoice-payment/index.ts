
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

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [VERIFY-PAYMENT] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now();
  const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep('Payment verification started', { requestId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
      logStep('Missing environment variables', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasStripeKey: !!stripeSecretKey
      });
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })

    const { sessionId, invoiceId }: VerifyPaymentRequest = await req.json()
    logStep('Processing verification request', { sessionId, invoiceId, requestId });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep('Stripe session retrieved', {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata
    });
    
    if (session.payment_status === 'paid') {
      logStep('Payment confirmed as paid, starting database updates', { requestId });

      // Update invoice status to paid
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (invoiceUpdateError) {
        logStep('Error updating invoice status', { error: invoiceUpdateError, requestId });
        throw new Error('Failed to update invoice status')
      }
      
      logStep('Invoice status updated to paid', { invoiceId, requestId });

      // Get the order ID from the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('order_id')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) {
        logStep('Error fetching invoice for order ID', { error: invoiceError, requestId });
        throw new Error('Failed to get order ID from invoice')
      }

      const orderId = invoiceData.order_id
      logStep('Order ID from invoice', { orderId, requestId });

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
          logStep('Error updating order payment status', { error: orderUpdateError, requestId });
          throw new Error('Failed to update order payment status')
        }
        
        logStep('Order payment status updated successfully', { orderId, requestId });

        // Send payment confirmation email and admin notification
        try {
          const { data: orderData, error: orderFetchError } = await supabase
            .from('orders')
            .select(`
              order_number,
              customer_name,
              products,
              customers!orders_customer_id_fkey(email)
            `)
            .eq('id', orderId)
            .single();

          const { data: invoiceDetailData, error: invoiceDetailError } = await supabase
            .from('invoices')
            .select('invoice_number, amount, currency')
            .eq('id', invoiceId)
            .single();

          if (!orderFetchError && !invoiceDetailError && orderData?.customers?.email) {
            // Generate receipt
            const { data: receiptData, error: receiptError } = await supabase.functions.invoke('generate-receipt', {
              body: { invoiceId, sessionId }
            });

            const receiptDownloadUrl = receiptData?.downloadUrl || undefined;

            // Send payment confirmation email to customer
            const { error: emailError } = await supabase.functions.invoke('send-emails', {
              body: {
                type: 'payment-confirmation',
                data: {
                  customerName: orderData.customer_name,
                  customerEmail: orderData.customers.email,
                  orderNumber: orderData.order_number,
                  invoiceNumber: invoiceDetailData.invoice_number,
                  paymentAmount: invoiceDetailData.amount,
                  currency: invoiceDetailData.currency || 'USD',
                  paymentMethod: 'Credit Card',
                  transactionId: sessionId,
                  orderItems: orderData.products || [],
                  receiptDownloadUrl,
                  paymentDate: new Date().toLocaleDateString()
                }
              }
            });

            if (emailError) {
              logStep('Warning: Failed to send payment confirmation email', { 
                error: emailError, 
                requestId 
              });
            } else {
              logStep('Payment confirmation email sent successfully', { requestId });
            }

            // Send admin notification about successful payment
            const { error: adminNotificationError } = await supabase.functions.invoke('send-emails', {
              body: {
                type: 'admin-payment-notification',
                data: {
                  orderNumber: orderData.order_number,
                  customerName: orderData.customer_name,
                  paymentAmount: invoiceDetailData.amount,
                  currency: invoiceDetailData.currency || 'USD',
                  transactionId: sessionId,
                  invoiceNumber: invoiceDetailData.invoice_number
                }
              }
            });

            if (adminNotificationError) {
              logStep('Warning: Failed to send admin payment notification', { 
                error: adminNotificationError, 
                requestId 
              });
            } else {
              logStep('Admin payment notification sent successfully', { requestId });
            }
          }
        } catch (emailError: any) {
          logStep('Warning: Failed to send emails', { 
            error: emailError.message, 
            requestId 
          });
        }
      }

      const processingTime = Date.now() - startTime;
      logStep('Payment verification completed successfully', { 
        requestId, 
        processingTime: `${processingTime}ms`,
        orderId: orderId || null
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'paid',
          message: 'Payment verified and statuses updated successfully',
          orderId: orderId || null,
          processingTime,
          requestId
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
      logStep('Payment not completed', { 
        status: session.payment_status, 
        requestId,
        processingTime: `${Date.now() - startTime}ms`
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: 'Payment not completed',
          requestId
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
    const processingTime = Date.now() - startTime;
    logStep('Critical error in verify-invoice-payment', { 
      error: error.message || 'Unknown error',
      requestId,
      processingTime: `${processingTime}ms`
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to verify payment',
        details: error.name || 'UnknownError',
        requestId,
        processingTime
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
