
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import React from 'npm:react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { OrderConfirmationEmail } from './_templates/order-confirmation.tsx'
import { DeliveryStatusUpdateEmail } from './_templates/delivery-status-update.tsx'
import { InvoiceEmail } from './_templates/invoice.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
          })
        )
        subject = `Invoice ${data.invoiceNumber} - ${data.orderNumber}`
        toEmail = data.customerEmail
        break

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    console.log('Sending email to:', toEmail, 'Subject:', subject)

    const { data: emailResult, error } = await resend.emails.send({
      from: 'Order Management <orders@yourdomain.com>',
      to: [toEmail],
      subject,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', emailResult)

    // Log email sent to database
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

serve(handler)
