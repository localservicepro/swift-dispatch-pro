
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
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Step 1: Check environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment variables check:')
    console.log('- RESEND_API_KEY exists:', !!resendApiKey)
    console.log('- RESEND_API_KEY length:', resendApiKey?.length || 0)
    console.log('- RESEND_API_KEY prefix:', resendApiKey?.substring(0, 7) || 'none')
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY is missing')
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured. Please add your Resend API key to the edge function secrets.',
          debug: 'Environment variable RESEND_API_KEY is not set'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing')
      return new Response(
        JSON.stringify({ 
          error: 'Supabase configuration missing',
          debug: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Step 2: Initialize services
    console.log('Initializing Resend with API key...')
    const resend = new Resend(resendApiKey)
    
    console.log('Initializing Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 3: Parse request body
    console.log('Parsing request body...')
    let requestBody: any
    try {
      const rawBody = await req.text()
      console.log('Raw body received:', rawBody)
      console.log('Raw body length:', rawBody.length)
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Request body is empty')
      }
      
      requestBody = JSON.parse(rawBody)
      console.log('✅ JSON parsed successfully')
      console.log('Request body keys:', Object.keys(requestBody || {}))
      console.log('Request body type:', requestBody?.type)
      console.log('Request body data keys:', Object.keys(requestBody?.data || {}))
    } catch (parseError: any) {
      console.error('❌ JSON parsing failed:', parseError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message,
          debug: 'Failed to parse request body as JSON'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Step 4: Validate request structure
    const { type, data }: EmailRequest = requestBody

    if (!type) {
      console.error('❌ Missing email type')
      return new Response(
        JSON.stringify({ 
          error: 'Email type is required',
          debug: 'type field is missing from request body'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid or missing data:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Data object is required and must be valid',
          debug: {
            dataExists: !!data,
            dataType: typeof data,
            dataKeys: data ? Object.keys(data) : []
          }
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    console.log('✅ Request validation passed')
    console.log('Email type:', type)
    console.log('Data structure:', JSON.stringify(data, null, 2))

    // Step 5: Prepare email content
    let emailHtml: string
    let subject: string
    let toEmail: string

    console.log('=== RENDERING EMAIL TEMPLATE ===')
    
    try {
      switch (type) {
        case 'order-confirmation':
          console.log('📧 Preparing order confirmation email')
          
          // Validate required fields
          const requiredFields = ['customerName', 'orderNumber', 'customerEmail']
          const missingFields = requiredFields.filter(field => !data[field])
          
          if (missingFields.length > 0) {
            console.error('❌ Missing required fields:', missingFields)
            throw new Error(`Missing required fields for order confirmation: ${missingFields.join(', ')}`)
          }
          
          console.log('Template data:')
          console.log('- customerName:', data.customerName)
          console.log('- orderNumber:', data.orderNumber)
          console.log('- customerEmail:', data.customerEmail)
          console.log('- orderItems length:', data.orderItems?.length || 0)
          console.log('- totalAmount:', data.totalAmount)
          
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
          console.log('📧 Preparing delivery status update email')
          
          const requiredDeliveryFields = ['customerName', 'orderNumber', 'customerEmail', 'newStatus']
          const missingDeliveryFields = requiredDeliveryFields.filter(field => !data[field])
          
          if (missingDeliveryFields.length > 0) {
            console.error('❌ Missing required fields:', missingDeliveryFields)
            throw new Error(`Missing required fields for delivery update: ${missingDeliveryFields.join(', ')}`)
          }
          
          console.log('Template data:')
          console.log('- customerName:', data.customerName)
          console.log('- orderNumber:', data.orderNumber)
          console.log('- customerEmail:', data.customerEmail)
          console.log('- newStatus:', data.newStatus)
          console.log('- oldStatus:', data.oldStatus)
          
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
          console.log('📧 Preparing invoice email')
          
          const requiredInvoiceFields = ['customerName', 'orderNumber', 'invoiceNumber', 'customerEmail']
          const missingInvoiceFields = requiredInvoiceFields.filter(field => !data[field])
          
          if (missingInvoiceFields.length > 0) {
            console.error('❌ Missing required fields:', missingInvoiceFields)
            throw new Error(`Missing required fields for invoice: ${missingInvoiceFields.join(', ')}`)
          }
          
          console.log('Template data:')
          console.log('- customerName:', data.customerName)
          console.log('- orderNumber:', data.orderNumber)
          console.log('- invoiceNumber:', data.invoiceNumber)
          console.log('- customerEmail:', data.customerEmail)
          console.log('- orderItems length:', data.orderItems?.length || 0)
          console.log('- totalAmount:', data.totalAmount)
          
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
          console.error('❌ Unknown email type:', type)
          throw new Error(`Unknown email type: ${type}`)
      }
      
      console.log('✅ Email template rendered successfully')
      console.log('Subject:', subject)
      console.log('To email:', toEmail)
      console.log('HTML length:', emailHtml.length)
      
    } catch (renderError: any) {
      console.error('❌ Template rendering failed:', renderError.message)
      console.error('Error stack:', renderError.stack)
      
      // Fallback: Send simple HTML email
      console.log('🔄 Attempting fallback simple email')
      emailHtml = `
        <html>
          <body>
            <h1>Email Notification</h1>
            <p>Dear ${data.customerName || 'Customer'},</p>
            <p>This is a notification regarding your order ${data.orderNumber || 'N/A'}.</p>
            <p>Type: ${type}</p>
            <p>We apologize for the simplified format. Please contact us if you need more details.</p>
          </body>
        </html>
      `
      subject = `Notification - ${data.orderNumber || 'Order'}`
      toEmail = data.customerEmail
      
      if (!toEmail) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to render email template and no fallback email available',
            details: renderError.message,
            debug: 'Template rendering failed and customerEmail is missing'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    }

    // Step 6: Send email via Resend
    console.log('=== SENDING EMAIL VIA RESEND ===')
    console.log('From: Order Management <onboarding@resend.dev>')
    console.log('To:', toEmail)
    console.log('Subject:', subject)

    try {
      const { data: emailResult, error } = await resend.emails.send({
        from: 'Order Management <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html: emailHtml,
      })

      if (error) {
        console.error('❌ Resend API error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Log the failed email attempt to database
        try {
          const { error: logError } = await supabase
            .from('email_logs')
            .insert({
              email_type: type,
              recipient_email: toEmail,
              subject,
              status: 'failed',
              error_message: error.message || JSON.stringify(error),
              sent_at: new Date().toISOString(),
            })

          if (logError) {
            console.error('⚠️ Error logging failed email:', logError)
          } else {
            console.log('✅ Failed email logged to database')
          }
        } catch (dbError) {
          console.error('⚠️ Database logging failed:', dbError)
        }

        throw error
      }

      console.log('✅ Email sent successfully via Resend!')
      console.log('Email ID:', emailResult.id)

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
          emailId: emailResult.id,
          debug: {
            type,
            recipient: toEmail,
            subject,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } catch (sendError: any) {
      console.error('❌ Email sending failed:', sendError.message)
      console.error('Send error details:', JSON.stringify(sendError, null, 2))
      throw sendError
    }

  } catch (error: any) {
    console.error('=== EMAIL FUNCTION ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.name || 'UnknownError',
        debug: {
          timestamp: new Date().toISOString(),
          stack: error.stack || 'No stack trace available'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
