
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { render } from 'npm:@react-email/render@0.0.15'
import * as React from 'npm:react@18.2.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

import { 
  renderOrderConfirmationEmail, 
  renderDeliveryStatusUpdateEmail, 
  renderPaymentConfirmationEmail,
  renderInvoiceEmail,
  renderBatchInvoiceEmail,
  renderPortalWelcomeEmail,
  renderPortalLoginEmail,
  renderPortalPinCreatedEmail,
  renderPortalPinRegeneratedEmail
} from './templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get email settings from database
async function getEmailSettings() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration for email settings');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching email settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch email settings:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type: emailType, data: emailData } = await req.json()

    // Get email settings from database
    const emailSettings = await getEmailSettings();
    const resendApiKey = emailSettings?.resend_api_key || Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('No Resend API key found in settings or environment');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let htmlContent = '';
    let subject = '';
    let recipientEmail = '';
    let senderEmail = emailSettings?.sender_email || 'onboarding@resend.dev';
    let senderName = emailSettings?.sender_name || 'Acme';

    if (emailType === 'admin-payment-notification') {
      console.log('Processing admin payment notification...');
      const adminEmail = emailSettings?.admin_email || 'admin@localservicepro.com.au';
      recipientEmail = adminEmail;
      subject = `Payment Received - Order ${emailData.orderNumber}`;
      
      // Simple HTML template for admin notification
      htmlContent = `
        <h2>Payment Received</h2>
        <p><strong>Order Number:</strong> ${emailData.orderNumber}</p>
        <p><strong>Customer:</strong> ${emailData.customerName}</p>
        <p><strong>Amount:</strong> ${emailData.currency} ${emailData.paymentAmount}</p>
        <p><strong>Transaction ID:</strong> ${emailData.transactionId}</p>
        <p><strong>Invoice Number:</strong> ${emailData.invoiceNumber}</p>
        <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
      `;
    } else if (emailType === 'batch-invoice') {
      console.log('Processing batch invoice email...');
      subject = `Batch Invoice ${emailData.invoiceNumber} - Split Order ${emailData.masterOrderNumber}`;
      htmlContent = await renderBatchInvoiceEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'invoice') {
      console.log('Processing invoice email...');
      subject = `Invoice ${emailData.invoiceNumber} - Order ${emailData.orderNumber}`;
      htmlContent = await renderInvoiceEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'order-confirmation') {
      console.log('Processing order confirmation email...');
      subject = `Order Confirmation - Order ${emailData.orderNumber}`;
      htmlContent = await renderOrderConfirmationEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'delivery-status-update') {
      console.log('Processing delivery status update email...');
      subject = `Delivery Status Update - Order ${emailData.orderNumber}`;
      htmlContent = await renderDeliveryStatusUpdateEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'payment-confirmation') {
      console.log('Processing payment confirmation email...');
      subject = `Payment Confirmation - Order ${emailData.orderNumber}`;
      htmlContent = await renderPaymentConfirmationEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'portal-welcome') {
      console.log('Processing portal welcome email...');
      subject = `Welcome to Your Customer Portal - ${emailData.businessName}`;
      htmlContent = await renderPortalWelcomeEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'portal-login') {
      console.log('Processing portal login email...');
      subject = `Customer Portal Login - ${emailData.businessName}`;
      htmlContent = await renderPortalLoginEmail(emailData);
      recipientEmail = emailData.customerEmail;
    } else if (emailType === 'portal-pin-created') {
      console.log('Processing portal PIN created email...');
      subject = 'Your Customer Portal PIN Code';
      htmlContent = await renderPortalPinCreatedEmail(emailData);
      recipientEmail = emailData.to || emailData.customerEmail;
    } else if (emailType === 'portal-pin-regenerated') {
      console.log('Processing portal PIN regenerated email...');
      subject = 'Your Portal PIN Has Been Reset';
      htmlContent = await renderPortalPinRegeneratedEmail(emailData);
      recipientEmail = emailData.to || emailData.customerEmail;
    } else if (emailType === 'test-connection') {
      console.log('Processing test connection email...');
      subject = 'Email Configuration Test';
      htmlContent = `
        <h2>Email Configuration Test</h2>
        <p>Hello ${emailData.customerName},</p>
        <p>${emailData.testMessage}</p>
        <p>If you received this email, your email configuration is working correctly!</p>
        <p>Best regards,<br>Your System</p>
      `;
      recipientEmail = emailData.customerEmail;
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
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: recipientEmail,
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
