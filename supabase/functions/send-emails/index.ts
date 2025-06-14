
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
    
    // Check environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:')
    console.log('- RESEND_API_KEY exists:', !!resendApiKey)
    console.log('- RESEND_API_KEY starts with re_:', resendApiKey?.startsWith('re_') || false)
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY is missing')
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured',
          details: 'Please add your Resend API key to the edge function secrets'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    if (!resendApiKey.startsWith('re_')) {
      console.error('❌ RESEND_API_KEY format invalid - should start with re_')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid RESEND_API_KEY format',
          details: 'API key should start with "re_". Please check your Resend API key.'
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

    console.log('Email type:', type)
    console.log('Data keys:', Object.keys(data || {}))

    // Validate request
    if (!type || !data) {
      throw new Error('Invalid request: type and data are required')
    }

    // Prepare email content
    let emailHtml: string
    let subject: string
    let toEmail: string

    console.log('=== RENDERING EMAIL TEMPLATE ===')
    
    switch (type) {
      case 'order-confirmation':
        if (!data.customerName || !data.orderNumber || !data.customerEmail) {
          throw new Error('Missing required fields: customerName, orderNumber, customerEmail')
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
        if (!data.customerName || !data.orderNumber || !data.customerEmail || !data.newStatus) {
          throw new Error('Missing required fields: customerName, orderNumber, customerEmail, newStatus')
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
        if (!data.customerName || !data.orderNumber || !data.invoiceNumber || !data.customerEmail) {
          throw new Error('Missing required fields: customerName, orderNumber, invoiceNumber, customerEmail')
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
    
    console.log('✅ Email template rendered')
    console.log('Subject:', subject)
    console.log('To:', toEmail)

    // Send email via Resend
    console.log('=== SENDING EMAIL VIA RESEND ===')

    try {
      const { data: emailResult, error } = await resend.emails.send({
        from: 'Order Management <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html: emailHtml,
      })

      if (error) {
        console.error('❌ Resend API error:', error)
        
        // Log failed email
        await supabase
          .from('email_logs')
          .insert({
            email_type: type,
            recipient_email: toEmail,
            subject,
            status: 'failed',
            error_message: `Resend API Error: ${error.message || JSON.stringify(error)}`,
            sent_at: new Date().toISOString(),
          })

        return new Response(
          JSON.stringify({ 
            error: 'Failed to send email via Resend',
            details: error.message || 'Unknown Resend error',
            resendError: error
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }

      console.log('✅ Email sent successfully!')
      console.log('Email ID:', emailResult?.id)

      // Log successful email
      await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: toEmail,
          subject,
          status: 'sent',
          external_id: emailResult?.id,
          sent_at: new Date().toISOString(),
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          emailId: emailResult?.id,
          message: 'Email sent successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    } catch (sendError: any) {
      console.error('❌ Email sending failed:', sendError)
      
      // Log failed email
      await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: toEmail,
          subject,
          status: 'failed',
          error_message: `Send Error: ${sendError.message}`,
          sent_at: new Date().toISOString(),
        })

      throw sendError
    }

  } catch (error: any) {
    console.error('=== EMAIL FUNCTION ERROR ===')
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
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
