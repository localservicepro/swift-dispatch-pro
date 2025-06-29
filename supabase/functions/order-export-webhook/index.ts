
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    order_number: string;
    status: string;
    customer_name: string;
    total_amount: number;
    [key: string]: any;
  };
  old_record?: any;
  schema: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Order export webhook triggered');
    
    // Parse the webhook payload
    const payload: WebhookPayload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Only process orders table events
    if (payload.table !== 'orders') {
      console.log('Ignoring non-orders table event');
      return new Response('Event ignored - not orders table', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Skip deleted orders or if no record ID
    if (!payload.record?.id) {
      console.log('No record ID found, skipping');
      return new Response('No record ID', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the export function to get comprehensive order data
    console.log(`Fetching export data for order: ${payload.record.id}`);
    
    const { data: exportData, error: exportError } = await supabase
      .rpc('get_order_export_data', { 
        order_id_param: payload.record.id 
      });

    if (exportError) {
      console.error('Error fetching export data:', exportError);
      throw new Error(`Failed to fetch export data: ${exportError.message}`);
    }

    if (!exportData || exportData.length === 0) {
      console.log('No export data found for order');
      return new Response('No export data found', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const orderData = exportData[0];
    console.log('Retrieved order export data:', JSON.stringify(orderData, null, 2));

    // Format the data for Make/Google Sheets
    const formattedData = {
      // Event metadata
      event_type: payload.type,
      timestamp: new Date().toISOString(),
      
      // Core order information
      order_id: orderData.id,
      order_number: orderData.order_number,
      purchase_order: orderData.purchase_order || '',
      created_at: orderData.created_at_formatted,
      
      // Customer information
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone || '',
      customer_email: orderData.customer_email || '',
      
      // Address information
      billing_address: orderData.billing_address,
      delivery_address: orderData.delivery_address,
      suburb_full: orderData.suburb_full,
      
      // Financial information
      subtotal: orderData.subtotal || 0,
      adjustments: orderData.adjustments || 0,
      delivery_fee: orderData.delivery_fee || 0,
      total_amount: orderData.total_amount,
      payment_method: orderData.payment_method || '',
      payment_status: orderData.payment_status || '',
      
      // Order status and logistics
      order_status: orderData.order_status,
      driver_name: orderData.driver_name,
      truck_info: orderData.truck_info,
      delivery_schedule: orderData.delivery_schedule,
      
      // Products and notes
      products_formatted: orderData.products_formatted,
      all_notes: orderData.all_notes || '',
      record_status: orderData.record_status
    };

    console.log('Formatted data for webhook:', JSON.stringify(formattedData, null, 2));

    // Get the Make webhook URL from environment variables
    const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    
    if (!makeWebhookUrl) {
      console.warn('MAKE_WEBHOOK_URL not configured, logging data only');
      return new Response(JSON.stringify({
        message: 'Data processed successfully (webhook URL not configured)',
        data: formattedData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Send to Make webhook with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Sending to Make webhook (attempt ${retryCount + 1})`);
        
        const makeResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData)
        });

        if (makeResponse.ok) {
          const responseText = await makeResponse.text();
          console.log('Successfully sent to Make webhook:', responseText);
          
          return new Response(JSON.stringify({
            message: 'Webhook sent successfully',
            make_response: responseText,
            data: formattedData
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } else {
          const errorText = await makeResponse.text();
          console.error(`Make webhook failed (${makeResponse.status}):`, errorText);
          
          if (retryCount === maxRetries - 1) {
            throw new Error(`Make webhook failed after ${maxRetries} attempts: ${errorText}`);
          }
        }
      } catch (error) {
        console.error(`Make webhook attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount === maxRetries - 1) {
          throw error;
        }
      }
      
      retryCount++;
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }

  } catch (error: any) {
    console.error('Error in order export webhook:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
