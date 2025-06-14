
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
    console.log('=== EMAIL FUNCTION START ===')
    
    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:')
    console.log('- RESEND_API_KEY exists:', !!resendApiKey)
    console.log('- RESEND_API_KEY starts with re_:', resendApiKey?.startsWith('re_'))
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)

    if (!resendApiKey || !resendApiKey.startsWith('re_')) {
      console.error('❌ Invalid RESEND_API_KEY')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Resend API key. Please check your configuration.',
          debug: 'RESEND_API_KEY is missing or invalid format'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Initialize services
    console.log('Initializing Resend...')
    const resend = new Resend(resendApiKey)
    
    console.log('Initializing Supabase...')
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Parse request
    const requestBody = await req.json()
    const { type, data }: EmailRequest = requestBody

    console.log('Request type:', type)
    console.log('Request data keys:', Object.keys(data || {}))

    if (!type || !data) {
      throw new Error('Missing type or data in request')
    }

    // Prepare email based on type
    let emailHtml: string
    let subject: string
    let toEmail: string

    console.log('=== PREPARING EMAIL ===')

    try {
      switch (type) {
        case 'order-confirmation':
          console.log('Preparing order confirmation email')
          if (!data.customerName || !data.orderNumber || !data.customerEmail) {
            throw new Error('Missing required fields for order confirmation')
          }
          
          emailHtml = await renderAsync(
            React.createElement(OrderConfirmationEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderItems: data.orderItems || [],
              totalAmount: data.totalAmount || 0,
              deliveryAddress: data.deliveryAddress || '',
              deliveryDate: data.deliveryDate,
              deliveryTime: data.deliveryTime,
              specialInstructions: data.specialInstructions,
            })
          )
          subject = `Order Confirmation - ${data.orderNumber}`
          toEmail = data.customerEmail
          break

        case 'delivery-status-update':
          console.log('Preparing delivery status update email')
          if (!data.customerName || !data.orderNumber || !data.customerEmail || !data.newStatus) {
            throw new Error('Missing required fields for delivery update')
          }
          
          emailHtml = await renderAsync(
            React.createElement(DeliveryStatusUpdateEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              oldStatus: data.oldStatus || '',
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
          console.log('Preparing invoice email')
          if (!data.customerName || !data.orderNumber || !data.invoiceNumber || !data.customerEmail) {
            throw new Error('Missing required fields for invoice')
          }
          
          emailHtml = await renderAsync(
            React.createElement(InvoiceEmail, {
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              invoiceNumber: data.invoiceNumber,
              orderItems: data.orderItems || [],
              subtotal: data.subtotal || 0,
              deliveryFee: data.deliveryFee || 0,
              totalAmount: data.totalAmount || 0,
              dueDate: data.dueDate || new Date().toISOString(),
              paymentStatus: data.paymentStatus || 'Pending',
              paymentUrl: data.paymentUrl,
            })
          )
          subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
          toEmail = data.customerEmail
          break

        default:
          throw new Error(`Unknown email type: ${type}`)
      }
      
      console.log('✅ Email template rendered successfully')
      console.log('Subject:', subject)
      console.log('To:', toEmail)
      console.log('HTML length:', emailHtml.length)
      
    } catch (templateError: any) {
      console.error('❌ Template rendering failed:', templateError.message)
      
      // Use simple fallback email
      emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Email Notification</h1>
            <p>Dear ${data.customerName || 'Customer'},</p>
            <p>This is a notification regarding your order ${data.orderNumber || 'N/A'}.</p>
            <p><strong>Type:</strong> ${type}</p>
            <p>We apologize for the simplified format. Please contact us if you need more details.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This email was sent automatically. Please do not reply.</p>
          </body>
        </html>
      `
      subject = `Notification - ${data.orderNumber || 'Order'}`
      toEmail = data.customerEmail
      
      if (!toEmail) {
        throw new Error('No customer email available for fallback')
      }
      
      console.log('Using fallback email template')
    }

    // Send email via Resend
    console.log('=== SENDING EMAIL VIA RESEND ===')
    console.log('From: Order Management <onboarding@resend.dev>')
    console.log('To:', toEmail)
    console.log('Subject:', subject)

    const emailResult = await resend.emails.send({
      from: 'Order Management <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html: emailHtml,
    })

    console.log('Resend response:', emailResult)

    if (emailResult.error) {
      console.error('❌ Resend API error:', emailResult.error)
      throw new Error(`Resend API error: ${emailResult.error.message || JSON.stringify(emailResult.error)}`)
    }

    if (!emailResult.data?.id) {
      console.error('❌ No email ID returned from Resend')
      throw new Error('Failed to get email ID from Resend')
    }

    console.log('✅ Email sent successfully!')
    console.log('Email ID:', emailResult.data.id)

    // Log successful email to database
    try {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: toEmail,
          subject,
          status: 'sent',
          external_id: emailResult.data.id,
          sent_at: new Date().toISOString(),
        })

      if (logError) {
        console.error('⚠️ Error logging successful email:', logError)
      } else {
        console.log('✅ Successful email logged to database')
      }
    } catch (dbError) {
      console.error('⚠️ Database logging failed:', dbError)
    }

    console.log('=== EMAIL FUNCTION SUCCESS ===')
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.data.id,
        message: 'Email sent successfully'
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
    console.error('=== EMAIL FUNCTION ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Try to log the failed email to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      const requestBody = await req.clone().json().catch(() => ({}))
      const toEmail = requestBody?.data?.customerEmail || 'unknown'
      const subject = `Failed Email - ${requestBody?.type || 'unknown'}`
      
      await supabase
        .from('email_logs')
        .insert({
          email_type: requestBody?.type || 'unknown',
          recipient_email: toEmail,
          subject: subject,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString(),
        })
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
