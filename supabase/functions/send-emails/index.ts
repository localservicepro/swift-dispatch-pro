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
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('Resend API Key')
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

    // Initialize Resend with the API key
    const resend = new Resend(resendApiKey)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, data }: EmailRequest = await req.json()
    console.log('Email type:', type, 'Data:', data)

    let emailHtml: string
    let subject: string
    let toEmail: string

    switch (type) {
      case 'order-confirmation':
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
        emailHtml = await renderAsync(
          React.createElement(InvoiceEmail, {
            customerName: data.customerName,
            orderNumber: data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            orderItems: data.orderItems || [],
            subtotal: data.subtotal,
            deliveryFee: data.deliveryFee,
            totalAmount: data.totalAmount,
            dueDate: data.dueDate,
            paymentStatus: data.paymentStatus,
            orderId: data.orderId,
          })
        )
        subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
        toEmail = data.customerEmail
        break

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    console.log('Sending email to:', toEmail, 'Subject:', subject)

    // Use the default Resend domain for now - user can update this later
    const { data: emailResult, error } = await resend.emails.send({
      from: 'Order Management <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      
      // Log the failed email attempt to database
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: toEmail,
          subject,
          status: 'failed',
          error_message: error.message || 'Unknown error occurred',
          sent_at: new Date().toISOString(),
        })

      if (logError) {
        console.error('Error logging failed email:', logError)
      }

      throw error
    }

    console.log('Email sent successfully:', emailResult)

    // Log successful email to database
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
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
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
