
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import React from 'npm:react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { OrderConfirmationEmail } from './_templates/order-confirmation.tsx'
import { DeliveryStatusUpdateEmail } from './_templates/delivery-status-update.tsx'
import { InvoiceEmail } from './_templates/invoice.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'order-confirmation' | 'delivery-status-update' | 'invoice'
  data: any
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Email function called')
    
    // Check for required environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasResendKey: !!resendApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      resendKeyPrefix: resendApiKey ? resendApiKey.substring(0, 3) : 'none'
    })

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured. Please add your Resend API key to the edge function secrets.' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Initialize Resend and Supabase
    const resend = new Resend(resendApiKey)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, data }: EmailRequest = await req.json()
    console.log('Email type:', type, 'Data keys:', Object.keys(data))

    let emailHtml: string
    let subject: string
    let toEmail: string

    try {
      switch (type) {
        case 'order-confirmation':
          console.log('Rendering order confirmation email...')
          emailHtml = await renderAsync(
            React.createElement(OrderConfirmationEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderItems: data.orderItems || [],
              totalAmount: data.totalAmount,
              deliveryAddress: data.deliveryAddress,
              deliveryDate: data.deliveryDate,
              deliveryTime: data.deliveryTime,
              specialInstructions: data.specialInstructions,
            })
          )
          subject = `Order Confirmation - ${data.orderNumber}`
          toEmail = data.customerEmail
          break

        case 'delivery-status-update':
          console.log('Rendering delivery status update email...')
          emailHtml = await renderAsync(
            React.createElement(DeliveryStatusUpdateEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              oldStatus: data.oldStatus,
              newStatus: data.newStatus,
              driverName: data.driverName,
              notes: data.notes,
              estimatedDeliveryTime: data.estimatedDeliveryTime,
            })
          )
          subject = `Delivery Update - ${data.orderNumber}`
          toEmail = data.customerEmail
          break

        case 'invoice':
          console.log('Rendering invoice email with data:', {
            customerName: data.customerName,
            orderNumber: data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            itemCount: data.orderItems?.length || 0,
            totalAmount: data.totalAmount,
            hasPaymentUrl: !!data.paymentUrl
          })
          
          // Validate required invoice data
          if (!data.customerName || !data.orderNumber || !data.invoiceNumber) {
            throw new Error('Missing required invoice data')
          }
          
          emailHtml = await renderAsync(
            React.createElement(InvoiceEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              invoiceNumber: data.invoiceNumber,
              orderItems: data.orderItems || [],
              subtotal: data.subtotal || 0,
              deliveryFee: data.deliveryFee || 0,
              totalAmount: data.totalAmount,
              dueDate: data.dueDate,
              paymentStatus: data.paymentStatus,
              paymentUrl: data.paymentUrl,
            })
          )
          subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
          toEmail = data.customerEmail
          break

        default:
          throw new Error(`Unknown email type: ${type}`)
      }
      console.log('Email template rendered successfully, HTML length:', emailHtml.length)
    } catch (renderError: any) {
      console.error('Template rendering error:', renderError)
      console.error('Error stack:', renderError.stack)
      
      // Create a simple HTML fallback for invoices
      if (type === 'invoice') {
        console.log('Creating fallback HTML for invoice')
        emailHtml = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>Invoice ${data.invoiceNumber}</h1>
              <p>Dear ${data.customerName},</p>
              <p>Please find your invoice for order ${data.orderNumber} below.</p>
              
              <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                <p><strong>Order #:</strong> ${data.orderNumber}</p>
                <p><strong>Due Date:</strong> ${data.dueDate}</p>
                <p><strong>Status:</strong> ${data.paymentStatus}</p>
              </div>
              
              ${data.paymentUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.paymentUrl}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Pay Invoice Now - $${data.totalAmount.toFixed(2)}
                  </a>
                </div>
              ` : ''}
              
              <div style="border: 1px solid #eee; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h2>Order Items</h2>
                ${(data.orderItems || []).map((item: any) => `
                  <p>${item.name} - Qty: ${item.quantity} - $${item.price.toFixed(2)}</p>
                `).join('')}
                
                <hr style="margin: 20px 0;">
                <p><strong>Subtotal: $${(data.subtotal || 0).toFixed(2)}</strong></p>
                <p><strong>Delivery Fee: $${(data.deliveryFee || 0).toFixed(2)}</strong></p>
                <p><strong>Total Amount: $${data.totalAmount.toFixed(2)}</strong></p>
              </div>
              
              <p>Thank you for your business!</p>
            </body>
          </html>
        `
        subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
        toEmail = data.customerEmail
        console.log('Fallback HTML created successfully')
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to render email template',
            details: renderError.message,
            type: renderError.name
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    }

    if (!toEmail || !subject || !emailHtml) {
      throw new Error('Missing required email data after template rendering')
    }

    console.log('Sending email to:', toEmail, 'Subject:', subject)

    // Send email using Resend
    const { data: emailResult, error } = await resend.emails.send({
      from: 'Order Management <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      
      // Log the failed email attempt to database
      try {
        const { error: logError } = await supabase
          .from('email_logs')
          .insert({
            email_type: type,
            recipient_email: toEmail,
            subject,
            status: 'failed',
            error_message: error.message || 'Unknown Resend error',
            sent_at: new Date().toISOString(),
          })

        if (logError) {
          console.error('Error logging failed email:', logError)
        }
      } catch (dbError) {
        console.error('Database logging error:', dbError)
      }

      throw error
    }

    console.log('Email sent successfully:', emailResult)

    // Log successful email to database
    try {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: toEmail,
          subject,
          status: 'sent',
          external_id: emailResult.id,
          sent_at: new Date().toISOString(),
        })

      if (logError) {
        console.error('Error logging email:', logError)
      }
    } catch (dbError) {
      console.error('Database logging error:', dbError)
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error: any) {
    console.error('Error in send-emails function:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.name || 'UnknownError',
        stack: error.stack || 'No stack trace available'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
