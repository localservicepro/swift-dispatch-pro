
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GHLOpportunity {
  title: string
  status: string
  monetaryValue: number
  pipelineId: string
  pipelineStageId?: string
  contactId: string
  name: string
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

    const { order } = await req.json()
    console.log('Syncing order to GHL:', order.id)

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

    // Use the secure API key from secrets
    const ghlApiKey = Deno.env.get('GHL_API_KEY') || ghlSettings.api_key

    // Get customer's GHL contact ID
    const { data: customer } = await supabaseClient
      .from('customers')
      .select('ghl_contact_id')
      .eq('id', order.customer_id)
      .single()

    if (!customer?.ghl_contact_id) {
      console.log('Customer not synced to GHL yet, skipping order sync')
      return new Response(
        JSON.stringify({ success: false, message: 'Customer not synced to GHL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map order status to GHL pipeline stage
    const stageMappings = ghlSettings.stage_mappings || {}
    const ghlStage = stageMappings[order.status] || 'new'

    const ghlOpportunity: GHLOpportunity = {
      title: `Order ${order.order_number}`,
      name: `Order ${order.order_number}`,
      status: ghlStage,
      monetaryValue: order.total_amount,
      pipelineId: ghlSettings.ghl_pipeline_id || 'default',
      contactId: customer.ghl_contact_id,
      customFields: {
        swiftdispatch_order_id: order.id,
        order_number: order.order_number,
        delivery_date: order.delivery_date,
        delivery_address: order.customer_address,
        payment_status: order.payment_status,
        order_status: order.status
      }
    }

    // Create sync log entry
    const { data: syncLog } = await supabaseClient
      .from('ghl_sync_logs')
      .insert({
        sync_type: 'order',
        local_record_id: order.id,
        ghl_contact_id: customer.ghl_contact_id,
        operation: order.ghl_opportunity_id ? 'update' : 'create',
        status: 'pending',
        request_payload: ghlOpportunity
      })
      .select()
      .single()

    let ghlResponse
    let ghlOpportunityId = order.ghl_opportunity_id

    try {
      if (ghlOpportunityId) {
        // Update existing opportunity
        ghlResponse = await fetch(`https://services.leadconnectorhq.com/opportunities/${ghlOpportunityId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(ghlOpportunity)
        })
      } else {
        // Create new opportunity
        ghlResponse = await fetch(`https://services.leadconnectorhq.com/opportunities/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify(ghlOpportunity)
        })
      }

      const ghlData = await ghlResponse.json()

      if (ghlResponse.ok) {
        // Get opportunity ID from response
        if (!ghlOpportunityId && ghlData.opportunity) {
          ghlOpportunityId = ghlData.opportunity.id
        }

        // Update order with GHL opportunity ID
        await supabaseClient
          .from('orders')
          .update({
            ghl_opportunity_id: ghlOpportunityId,
            last_synced_to_ghl: new Date().toISOString()
          })
          .eq('id', order.id)

        // Update sync log
        await supabaseClient
          .from('ghl_sync_logs')
          .update({
            status: 'success',
            ghl_opportunity_id: ghlOpportunityId,
            response_payload: ghlData,
            completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id)

        console.log('Order synced successfully to GHL:', ghlOpportunityId)
        return new Response(
          JSON.stringify({ success: true, ghl_opportunity_id: ghlOpportunityId }),
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
