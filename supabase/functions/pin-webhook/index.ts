import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pinWebhookUrl = Deno.env.get('PIN_WEBHOOK_URL');
    if (!pinWebhookUrl) {
      console.error('PIN_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'PIN webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch unsent webhook records
    const { data: records, error: fetchError } = await supabase
      .from('portal_pin_webhooks')
      .select('*')
      .eq('webhook_sent', false);

    if (fetchError) {
      console.error('Error fetching webhook records:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook records' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending PIN webhooks found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${records.length} PIN webhook records`);
    const results = [];

    for (const record of records) {
      try {
        const payload = {
          customer_id: record.customer_id,
          customer_name: record.customer_name,
          customer_email: record.customer_email,
          company_name: record.company_name,
          pin_code: record.pin_code,
          pin_expires_at: record.pin_expires_at,
          is_regeneration: record.is_regeneration,
          timestamp: new Date().toISOString(),
        };

        const webhookResponse = await fetch(pinWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SwiftDispatch-PIN-Webhook/1.0',
          },
          body: JSON.stringify(payload),
        });

        const responseText = await webhookResponse.text();
        const success = webhookResponse.ok;

        console.log(`PIN webhook ${success ? 'sent' : 'failed'} for ${record.customer_email}: ${webhookResponse.status}`);

        await supabase
          .from('portal_pin_webhooks')
          .update({
            webhook_sent: success,
            webhook_sent_at: success ? new Date().toISOString() : null,
            webhook_url: pinWebhookUrl,
            webhook_response: `${webhookResponse.status}: ${responseText}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        results.push({ customer_id: record.customer_id, success, status: webhookResponse.status });
      } catch (error: any) {
        console.error(`Error processing PIN webhook for ${record.customer_email}:`, error);

        await supabase
          .from('portal_pin_webhooks')
          .update({
            webhook_sent: false,
            webhook_response: `Error: ${error.message}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        results.push({ customer_id: record.customer_id, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${results.length} PIN webhooks`, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('PIN webhook function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
