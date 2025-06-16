
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

    // Retrieve the checkout session from Stripe with retries
    let session;
    let retries = 3;
    while (retries > 0) {
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
        logStep('Stripe session retrieved successfully', {
          id: session.id,
          payment_status: session.payment_status,
          metadata: session.metadata,
          attempt: 4 - retries
        });
        break;
      } catch (error: any) {
        retries--;
        logStep(`Stripe session retrieval failed, retries left: ${retries}`, { 
          error: error.message,
          requestId 
        });
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    if (session.payment_status === 'paid') {
      logStep('Payment confirmed as paid, starting database updates', { requestId });

      // Start transaction-like operations with rollback capability
      const updateOperations = [];

      try {
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
        updateOperations.push('invoice_updated');

        // Get order ID from session metadata or invoice record
        let orderId = session.metadata?.order_id
        logStep('Order ID from session metadata', { orderId, requestId });

        if (!orderId) {
          logStep('No order ID in metadata, fetching from invoice record', { requestId });
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .select('order_id')
            .eq('id', invoiceId)
            .single()

          if (invoiceError) {
            logStep('Error fetching invoice for order ID', { error: invoiceError, requestId });
            throw new Error('Failed to get order ID from invoice')
          }

          orderId = invoiceData?.order_id
          logStep('Order ID from invoice record', { orderId, requestId });
        }

        if (orderId) {
          // Update order payment status with enhanced data
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
            // Don't throw error for order update failure, but log it
            logStep('Warning: Order payment status update failed, but invoice was updated successfully', { 
              orderId, 
              requestId 
            });
          } else {
            logStep('Order payment status updated successfully', { orderId, requestId });
            updateOperations.push('order_updated');
          }

          // Log the payment verification success for audit trail
          try {
            await supabase
              .from('email_logs')
              .insert({
                recipient_email: 'system@admin.com',
                email_type: 'payment_verification',
                subject: `Payment Verified - Session ${sessionId}`,
                status: 'sent',
                external_id: sessionId
              });
            logStep('Payment verification logged for audit', { requestId });
          } catch (auditError) {
            logStep('Warning: Failed to log payment verification for audit', { 
              error: auditError, 
              requestId 
            });
          }
        } else {
          logStep('Warning: No order ID found to update order payment status', { requestId });
        }

        const processingTime = Date.now() - startTime;
        logStep('Payment verification completed successfully', { 
          requestId, 
          processingTime: `${processingTime}ms`,
          operationsCompleted: updateOperations,
          orderId: orderId || null
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'paid',
            message: 'Payment verified and statuses updated successfully',
            orderId: orderId || null,
            processingTime,
            requestId,
            operationsCompleted: updateOperations
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      } catch (updateError: any) {
        logStep('Error during database updates, attempting rollback', { 
          error: updateError.message, 
          requestId,
          completedOperations: updateOperations
        });

        // Attempt to rollback invoice update if order update failed
        if (updateOperations.includes('invoice_updated') && !updateOperations.includes('order_updated')) {
          try {
            await supabase
              .from('invoices')
              .update({ 
                status: 'pending',
                paid_at: null
              })
              .eq('id', invoiceId);
            logStep('Invoice status rollback completed', { requestId });
          } catch (rollbackError) {
            logStep('Critical: Failed to rollback invoice status', { 
              error: rollbackError, 
              requestId 
            });
          }
        }

        throw updateError;
      }
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
      processingTime: `${processingTime}ms`,
      stack: error.stack
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
