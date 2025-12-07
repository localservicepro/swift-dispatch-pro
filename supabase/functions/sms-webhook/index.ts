import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSWebhookData {
  id: string;
  order_id: string;
  order_number: string;
  products_formatted: string;
  driver_name: string | null;
  driver_email: string | null;
  driver_phone: string | null;
  delivery_address: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  status: string;
  assignment_status: string;
  truck_registration: string | null;
  truck_type: string | null;
  delivery_notes: string | null;
  order_notes: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('SMS Webhook function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get CRM webhook URL from secrets
    const crmWebhookUrl = Deno.env.get('CRM_SMS_WEBHOOK_URL');
    if (!crmWebhookUrl) {
      console.error('CRM_SMS_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'CRM webhook URL not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body if present (for manual triggers)
    let specificOrderId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        specificOrderId = body.order_id || null;
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }

    // Fetch pending SMS webhook records
    let query = supabase
      .from('order_sms_webhooks')
      .select('*')
      .eq('webhook_sent', false);

    if (specificOrderId) {
      query = query.eq('order_id', specificOrderId);
    }

    const { data: webhookRecords, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching webhook records:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook records' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!webhookRecords || webhookRecords.length === 0) {
      console.log('No pending SMS webhooks found');
      return new Response(
        JSON.stringify({ message: 'No pending SMS webhooks found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing ${webhookRecords.length} SMS webhook records`);

    const results = [];

    // Process each webhook record
    for (const record of webhookRecords) {
      try {
        console.log(`Processing SMS webhook for order ${record.order_number}`);

        // Prepare webhook payload
        const webhookPayload = {
          order_id: record.order_id,
          order_number: record.order_number,
          products: record.products_formatted,
          driver: record.driver_name || 'Not assigned',
          driver_email: record.driver_email,
          driver_phone: record.driver_phone,
          delivery_address: record.delivery_address,
          customer: record.customer_name,
          company: record.company_name,
          contact_person: record.contact_person || record.customer_name,
          phone: record.contact_phone,
          delivery_date: record.delivery_date,
          delivery_time: record.delivery_time,
          status: record.status,
          assignment_status: record.assignment_status,
          truck_registration: record.truck_registration,
          truck_type: record.truck_type,
          delivery_notes: record.delivery_notes,
          order_notes: record.order_notes,
          timestamp: new Date().toISOString()
        };

        // Send webhook to CRM
        const webhookResponse = await fetch(crmWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SwiftDispatch-SMS-Webhook/1.0'
          },
          body: JSON.stringify(webhookPayload)
        });

        const responseText = await webhookResponse.text();
        const success = webhookResponse.ok;

        console.log(`Webhook ${success ? 'sent successfully' : 'failed'} for order ${record.order_number}:`, {
          status: webhookResponse.status,
          response: responseText
        });

        // Update webhook record
        const { error: updateError } = await supabase
          .from('order_sms_webhooks')
          .update({
            webhook_sent: success,
            webhook_sent_at: success ? new Date().toISOString() : null,
            webhook_url: crmWebhookUrl,
            webhook_response: `${webhookResponse.status}: ${responseText}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Error updating webhook record ${record.id}:`, updateError);
        }

        results.push({
          order_id: record.order_id,
          order_number: record.order_number,
          success,
          status: webhookResponse.status,
          response: responseText
        });

      } catch (error) {
        console.error(`Error processing webhook for order ${record.order_number}:`, error);
        
        // Update record with error
        await supabase
          .from('order_sms_webhooks')
          .update({
            webhook_sent: false,
            webhook_response: `Error: ${error.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);

        results.push({
          order_id: record.order_id,
          order_number: record.order_number,
          success: false,
          error: error.message
        });
      }
    }

    console.log('SMS webhook processing completed:', results);

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} SMS webhooks`,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('SMS webhook function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);