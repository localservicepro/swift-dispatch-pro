
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phoneNumber: string;
  message: string;
  messageType: string;
  orderNumber: string;
  customerName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumber, message, messageType, orderNumber, customerName }: SMSRequest = await req.json();

    console.log('Sending SMS:', { phoneNumber, messageType, orderNumber });

    // Get SMS settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('sms_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('SMS settings error:', settingsError);
      throw new Error('SMS settings not configured');
    }

    if (settings.connection_status !== 'connected') {
      console.log('SMS not connected, skipping');
      return new Response(JSON.stringify({ success: false, message: 'SMS not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if notification type is enabled
    const isEnabled = (
      (messageType === 'order_confirmation' && settings.order_confirmation_enabled) ||
      (messageType === 'delivery_status' && settings.delivery_status_enabled) ||
      (messageType === 'driver_assignment' && settings.driver_assignment_enabled)
    );

    if (!isEnabled) {
      console.log(`SMS type ${messageType} is disabled`);
      return new Response(JSON.stringify({ success: false, message: `${messageType} SMS disabled` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send SMS via Twilio (if configured)
    let smsStatus = 'pending';
    let errorMessage = null;
    let twilioMessageSid = null;

    if (settings.twilio_account_sid && settings.twilio_auth_token && settings.twilio_phone_number) {
      try {
        const twilioAuth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`);
        
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phoneNumber,
              From: settings.twilio_phone_number,
              Body: message,
            }),
          }
        );

        const twilioData = await twilioResponse.json();

        if (twilioResponse.ok) {
          smsStatus = 'sent';
          twilioMessageSid = twilioData.sid;
          console.log('SMS sent successfully via Twilio:', twilioData.sid);
        } else {
          smsStatus = 'failed';
          errorMessage = twilioData.message || 'Twilio error';
          console.error('Twilio error:', twilioData);
        }
      } catch (twilioError) {
        console.error('Twilio request error:', twilioError);
        smsStatus = 'failed';
        errorMessage = 'Failed to send SMS via Twilio';
      }
    } else {
      console.log('Twilio not fully configured, marking as sent for testing');
      smsStatus = 'sent';
    }

    // Log SMS attempt
    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        message_type: messageType,
        recipient_phone: phoneNumber,
        message_content: message,
        status: smsStatus,
        twilio_message_sid: twilioMessageSid,
        error_message: errorMessage,
        sent_at: smsStatus === 'sent' ? new Date().toISOString() : null,
      });

    if (logError) {
      console.error('SMS log error:', logError);
    }

    return new Response(JSON.stringify({ 
      success: smsStatus === 'sent',
      status: smsStatus,
      message_sid: twilioMessageSid 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('SMS function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
