import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Google OAuth credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const redirectUri = `${supabaseUrl}/functions/v1/google-sheets-auth`;

  // Check if this is an OAuth callback (no auth needed for callbacks)
  const url = new URL(req.url);
  const isCallback = url.searchParams.has('code') || url.searchParams.has('error');

  // Authenticate the caller for non-callback requests
  if (!isCallback) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const url = new URL(req.url);
    
    // Detect OAuth callback by presence of code or error params
    const isCallback = url.searchParams.has('code') || url.searchParams.has('error');
    const action = isCallback ? 'callback' : (req.method === 'POST' ? (await req.json()).action : url.searchParams.get('action'));

    if (action === 'authorize') {
      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        // Redirect back to settings with error
        return new Response(null, {
          status: 302,
          headers: { Location: `${getAppUrl(supabaseUrl)}/settings?google_sheets_error=${error}` },
        });
      }

      if (!code) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${getAppUrl(supabaseUrl)}/settings?google_sheets_error=no_code` },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('Token exchange failed:', tokenData);
        return new Response(null, {
          status: 302,
          headers: { Location: `${getAppUrl(supabaseUrl)}/settings?google_sheets_error=token_exchange_failed` },
        });
      }

      // Get user email
      let googleEmail = '';
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        googleEmail = userInfo.email || '';
      } catch (e) {
        console.error('Failed to get user info:', e);
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Save tokens to DB
      const { data: settings } = await supabase
        .from('google_sheets_settings')
        .select('id')
        .limit(1)
        .single();

      if (settings) {
        await supabase
          .from('google_sheets_settings')
          .update({
            google_access_token: tokenData.access_token,
            google_refresh_token: tokenData.refresh_token || null,
            google_token_expires_at: expiresAt,
            connection_status: 'connected',
            service_account_email: googleEmail,
          })
          .eq('id', settings.id);
      }

      return new Response(null, {
        status: 302,
        headers: { Location: `${getAppUrl(supabaseUrl)}/settings?google_sheets_connected=true` },
      });
    }

    if (action === 'refresh') {
      const { data: settings } = await supabase
        .from('google_sheets_settings')
        .select('*')
        .limit(1)
        .single();

      if (!settings?.google_refresh_token) {
        return new Response(JSON.stringify({ error: 'No refresh token available' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: settings.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      await supabase
        .from('google_sheets_settings')
        .update({
          google_access_token: tokenData.access_token,
          google_token_expires_at: expiresAt,
        })
        .eq('id', settings.id);

      return new Response(JSON.stringify({ success: true, access_token: tokenData.access_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      await supabase
        .from('google_sheets_settings')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          connection_status: 'not_configured',
          service_account_email: null,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Sheets auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getAppUrl(supabaseUrl: string): string {
  // Extract project ID and construct app URL
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    return `https://swift-dispatch-pro.lovable.app`;
  }
  return 'http://localhost:5173';
}
