
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { validateEnv } from './validateEnv.ts'
import { getEmailTemplate } from './templates.ts'
import { sendEmail } from './emailSender.ts'
import { logEmail } from './logger.ts'

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

    let resend, supabase
    try {
      ({ resend, supabase } = validateEnv())
    } catch (envError: any) {
      return new Response(
        JSON.stringify({ error: envError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const { type, data }: EmailRequest = await req.json()
    let emailHtml = '', subject = '', toEmail = ''
    try {
      ({ emailHtml, subject, toEmail } = await getEmailTemplate({ type, data }))
      if (!toEmail || !subject || !emailHtml) throw new Error('Missing required email data after template rendering')
    } catch (renderError: any) {
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

    const from = 'SwiftDispatch Pro <updates@leadtocrm.com>'
    console.log('Sending email to:', toEmail, 'Subject:', subject)
    const { data: emailResult, error } = await sendEmail({
      from,
      to: toEmail,
      subject,
      html: emailHtml,
      resend,
    })

    if (error) {
      await logEmail({
        supabase,
        type,
        toEmail,
        subject,
        status: 'failed',
        errorMessage: error.message || 'Unknown Resend error',
      })
      throw error
    }
    await logEmail({
      supabase,
      type,
      toEmail,
      subject,
      status: 'sent',
      externalId: emailResult.id,
    })

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
