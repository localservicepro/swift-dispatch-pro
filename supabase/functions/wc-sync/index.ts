
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WooCommerceProduct {
  id: number
  name: string
  slug: string
  description: string
  short_description: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  stock_quantity: number | null
  manage_stock: boolean
  stock_status: string
  weight: string
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  images: Array<{
    id: number
    src: string
    name: string
    alt: string
  }>
  date_modified: string
  date_created: string
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [WC-SYNC] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  // New deployment - 2025-07-01
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('WC Sync function called - NEW VERSION', { method: req.method });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      logStep('Request body parsed', requestBody);
    } catch (parseError) {
      logStep('Failed to parse request body', parseError);
      throw new Error('Invalid request body format');
    }

    const { action, settingsId } = requestBody;

    if (!action || !settingsId) {
      logStep('Missing required parameters', { action, settingsId });
      throw new Error('Missing required parameters: action and settingsId');
    }

    logStep('WooCommerce sync started', { action, settingsId });

    // Get sync settings
    const { data: settings, error: settingsError } = await supabase
      .from('woocommerce_sync_settings')
      .select('*')
      .eq('id', settingsId)
      .eq('is_active', true)
      .single()

    if (settingsError) {
      logStep('Settings query error', settingsError);
      throw new Error(`Settings query failed: ${settingsError.message}`);
    }

    if (!settings) {
      logStep('No settings found', { settingsId });
      throw new Error('WooCommerce sync settings not found or inactive')
    }

    logStep('Settings retrieved', { storeUrl: settings.store_url });

    // Test WooCommerce connection
    const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    const wcHeaders = {
      'Authorization': `Basic ${wcAuth}`,
      'Content-Type': 'application/json',
    };

    logStep('Testing WooCommerce connection');

    const testResponse = await fetch(
      `${settings.store_url}/wp-json/wc/v3/system_status`,
      { headers: wcHeaders }
    );

    if (!testResponse.ok) {
      logStep('WooCommerce connection test failed', { 
        status: testResponse.status, 
        statusText: testResponse.statusText 
      });
      throw new Error(`WooCommerce API connection failed: ${testResponse.status}`);
    }

    logStep('WooCommerce connection successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WC Sync function is working and can connect to WooCommerce!',
        timestamp: new Date().toISOString(),
        version: 'wc-sync-v1'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    logStep('Function execution failed', { error: error.message });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'WC Sync failed',
        version: 'wc-sync-v1'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

serve(handler)
