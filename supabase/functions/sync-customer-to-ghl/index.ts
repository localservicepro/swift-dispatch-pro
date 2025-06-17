
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GHLCustomer {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address1?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  tags?: string[]
  customFields?: Record<string, any>
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

    const { customer } = await req.json()
    console.log('Syncing customer to GHL:', customer.id)

    // Get GHL settings
    const { data: ghlSettings, error: settingsError } = await supabaseClient
      .from('ghl_settings')
      .select('*')
      .single()

    if (settingsError || !ghlSettings?.api_key || !ghlSettings?.location_id) {
      console.log('GHL not configured, skipping sync')
      return new Response(
        JSON.stringify({ success: false, message: 'GHL not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map customer data to GHL format
    const fieldMappings = ghlSettings.customer_field_mappings || {}
    const ghlCustomer: GHLCustomer = {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address1: customer.full_address,
      tags: [customer.customer_type === 'trade' ? 'Trade Customer' : 'Account Customer'],
      customFields: {
        swiftdispatch_id: customer.id,
        customer_type: customer.customer_type,
        suburb_id: customer.suburb_id
      }
    }

    // Create sync log entry
    const { data: syncLog } = await supabaseClient
      .from('ghl_sync_logs')
      .insert({
        sync_type: 'customer',
        local_record_id: customer.id,
        operation: customer.ghl_contact_id ? 'update' : 'create',
        status: 'pending',
        request_payload: ghlCustomer
      })
      .select()
      .single()

    let ghlResponse
    let ghlContactId = customer.ghl_contact_id

    try {
      if (ghlContactId) {
        // Update existing contact
        ghlResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghlSettings.api_key}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(ghlCustomer)
        })
      } else {
        // Create new contact
        ghlResponse = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ghlSettings.api_key}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({
            ...ghlCustomer,
            locationId: ghlSettings.location_id
          })
        })
      }

      const ghlData = await ghlResponse.json()

      if (ghlResponse.ok) {
        // Get contact ID from response
        if (!ghlContactId && ghlData.contact) {
          ghlContactId = ghlData.contact.id
        }

        // Update customer with GHL contact ID
        await supabaseClient
          .from('customers')
          .update({
            ghl_contact_id: ghlContactId,
            last_synced_to_ghl: new Date().toISOString()
          })
          .eq('id', customer.id)

        // Update sync log
        await supabaseClient
          .from('ghl_sync_logs')
          .update({
            status: 'success',
            ghl_contact_id: ghlContactId,
            response_payload: ghlData,
            completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id)

        console.log('Customer synced successfully to GHL:', ghlContactId)
        return new Response(
          JSON.stringify({ success: true, ghl_contact_id: ghlContactId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        throw new Error(`GHL API error: ${ghlData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error syncing to GHL:', error)
      
      // Update sync log with error
      await supabaseClient
        .from('ghl_sync_logs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)

      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
