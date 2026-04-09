import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { account_number } = await req.json();

    if (!account_number || typeof account_number !== "string" || !/^\d{1,10}$/.test(account_number.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid account number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, business_name, full_address, customer_type, email, phone, suburb_id, stop_credit")
      .eq("account_number", account_number.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to validate account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "No active customer found with this account number" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (customer.stop_credit) {
      return new Response(
        JSON.stringify({ error: "This account is currently on stop credit. Please contact us." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = customer.company_name || customer.business_name || 
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";

    return new Response(
      JSON.stringify({
        customer: {
          id: customer.id,
          display_name: displayName,
          full_address: customer.full_address,
          customer_type: customer.customer_type,
          email: customer.email,
          phone: customer.phone,
          suburb_id: customer.suburb_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
