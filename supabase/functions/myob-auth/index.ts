import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MYOB_AUTH_URL = "https://secure.myob.com/oauth2/v1/authorize";
const MYOB_TOKEN_URL = "https://secure.myob.com/oauth2/v1/authorize";
const MYOB_API_BASE = "https://api.myob.com/accountright";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .limit(1);
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { action, ...body } = await req.json();

    switch (action) {
      case "get-settings": {
        const { data: settings } = await supabase
          .from("myob_settings")
          .select("connection_status, default_account_number, company_file_id")
          .limit(1)
          .single();
        return new Response(JSON.stringify({ settings: settings || { connection_status: "not_configured", default_account_number: "4-1010" } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "save-credentials": {
        const { clientId, clientSecret, companyFileId, companyFileUsername, companyFilePassword } = body;

        // Check if settings exist
        const { data: existing } = await supabase.from("myob_settings").select("id").limit(1).single();

        if (existing) {
          await supabase.from("myob_settings").update({
            client_id: clientId,
            client_secret: clientSecret,
            company_file_id: companyFileId,
            company_file_username: companyFileUsername,
            company_file_password: companyFilePassword,
            default_account_number: defaultAccountNumber || "4-1010",
            connection_status: "configured",
          }).eq("id", existing.id);
        } else {
          await supabase.from("myob_settings").insert({
            client_id: clientId,
            client_secret: clientSecret,
            company_file_id: companyFileId,
            company_file_username: companyFileUsername,
            company_file_password: companyFilePassword,
            default_account_number: defaultAccountNumber || "4-1010",
            connection_status: "configured",
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange-token": {
        const { code, redirectUri } = body;
        const { data: settings } = await supabase.from("myob_settings").select("*").limit(1).single();
        if (!settings) throw new Error("MYOB settings not configured");

        const tokenRes = await fetch("https://secure.myob.com/oauth2/v1/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: settings.client_id,
            client_secret: settings.client_secret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error_description || "Token exchange failed");

        await supabase.from("myob_settings").update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          connection_status: "connected",
        }).eq("id", settings.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refresh-token": {
        const { data: settings } = await supabase.from("myob_settings").select("*").limit(1).single();
        if (!settings?.refresh_token) throw new Error("No refresh token available");

        const tokenRes = await fetch("https://secure.myob.com/oauth2/v1/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: settings.client_id,
            client_secret: settings.client_secret,
            grant_type: "refresh_token",
            refresh_token: settings.refresh_token,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error_description || "Token refresh failed");

        await supabase.from("myob_settings").update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          connection_status: "connected",
        }).eq("id", settings.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { data: settings } = await supabase.from("myob_settings").select("id").limit(1).single();
        if (settings) {
          await supabase.from("myob_settings").update({
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
            connection_status: "configured",
          }).eq("id", settings.id);
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list-company-files": {
        const { data: settings } = await supabase.from("myob_settings").select("*").limit(1).single();
        if (!settings?.access_token) throw new Error("Not connected to MYOB");

        const res = await fetch(MYOB_API_BASE, {
          headers: {
            Authorization: `Bearer ${settings.access_token}`,
            "x-myobapi-key": settings.client_id,
            "x-myobapi-version": "v2",
          },
        });

        const files = await res.json();
        if (!res.ok) throw new Error("Failed to list company files");

        return new Response(JSON.stringify({ companyFiles: files }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("MYOB Auth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
