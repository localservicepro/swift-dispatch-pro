
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { render } from 'npm:@react-email/render@0.0.22'
import * as React from 'npm:react@18.2.0'

import { renderOrderConfirmationEmail, renderDeliveryStatusUpdateEmail, renderPaymentConfirmationEmail } from './templates.ts';
import { renderInvoiceEmail, renderBatchInvoiceEmail } from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type: emailType, data: emailData } = await req.json()

    let htmlContent = '';
    let subject = '';

    if (emailType === 'batch-invoice') {
      console.log('Processing batch invoice email...');
      subject = `Batch Invoice ${emailData.invoiceNumber} - Split Order ${emailData.masterOrderNumber}`;
      htmlContent = await renderBatchInvoiceEmail(emailData);
    } else if (emailType === 'invoice') {
      console.log('Processing invoice email...');
      subject = `Invoice ${emailData.invoiceNumber} - Order ${emailData.orderNumber}`;
      htmlContent = await renderInvoiceEmail(emailData);
    } else if (emailType === 'order-confirmation') {
      console.log('Processing order confirmation email...');
      subject = `Order Confirmation - Order ${emailData.orderNumber}`;
      htmlContent = await renderOrderConfirmationEmail(emailData);
    } else if (emailType === 'delivery-status-update') {
      console.log('Processing delivery status update email...');
      subject = `Delivery Status Update - Order ${emailData.orderNumber}`;
      htmlContent = await renderDeliveryStatusUpdateEmail(emailData);
    } else if (emailType === 'payment-confirmation') {
      console.log('Processing payment confirmation email...');
      subject = `Payment Confirmation - Order ${emailData.orderNumber}`;
      htmlContent = await renderPaymentConfirmationEmail(emailData);
    } else {
      console.error('Unknown email type:', emailType);
      return new Response(JSON.stringify({ error: 'Unknown email type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!htmlContent) {
      console.error('Failed to render email content.');
      return new Response(JSON.stringify({ error: 'Failed to render email content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>',
        to: emailData.customerEmail,
        subject: subject,
        html: htmlContent,
      })
    })

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const { id } = await res.json()
    console.log('Email sent successfully with id:', id)

    return new Response(
      JSON.stringify({ message: 'Email sent successfully', id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
