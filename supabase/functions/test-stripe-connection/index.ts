import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, isLive } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Stripe with the provided key
    const stripe = new Stripe(apiKey, { apiVersion: "2023-10-16" });

    // Test the connection by retrieving account info
    const account = await stripe.accounts.retrieve();
    
    // Update database with connection status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabase
      .from("payment_settings")
      .update({
        stripe_connection_status: "connected",
        stripe_last_tested_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.from("payment_settings").select("id").single()).data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          id: account.id,
          country: account.country,
          default_currency: account.default_currency,
          email: account.email,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe connection test failed:", error);
    
    // Update database with failed status
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabase
      .from("payment_settings")
      .update({
        stripe_connection_status: "error",
        stripe_last_tested_at: new Date().toISOString(),
      })
      .eq("id", (await supabase.from("payment_settings").select("id").single()).data?.id);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to connect to Stripe",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});