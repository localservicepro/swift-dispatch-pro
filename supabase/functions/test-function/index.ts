
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request): Promise<Response> => {
  // Force redeployment - Updated at 2025-07-01
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[TEST-FUNCTION] Function called successfully - Updated version');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        version: '2025-07-01'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[TEST-FUNCTION] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Test function failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

serve(handler)
