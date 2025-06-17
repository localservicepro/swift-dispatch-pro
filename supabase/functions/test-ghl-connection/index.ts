
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { api_key, location_id } = await req.json()

    if (!api_key || !location_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key and location ID are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Test connection by fetching location details
    const response = await fetch(`https://services.leadconnectorhq.com/locations/${location_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    })

    const data = await response.json()

    if (response.ok) {
      // Update connection status
      await supabaseClient
        .from('ghl_settings')
        .update({
          connection_status: 'connected',
          last_tested_at: new Date().toISOString()
        })
        .eq('id', (await supabaseClient.from('ghl_settings').select('id').single()).data?.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          location_name: data.location?.name || 'Connected',
          message: 'Connection successful' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Update connection status
      await supabaseClient
        .from('ghl_settings')
        .update({
          connection_status: 'error',
          last_tested_at: new Date().toISOString()
        })
        .eq('id', (await supabaseClient.from('ghl_settings').select('id').single()).data?.id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || 'Connection failed' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status
        }
      )
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
