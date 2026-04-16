import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "SF-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      account_number,
      products,
      delivery_method,
      delivery_address,
      delivery_date,
      delivery_time,
      special_instructions,
      order_notes,
      payment_method,
      suburb_id,
      contact_name,
      contact_phone,
      contact_email,
      delivery_fee,
    } = body;

    // Validate required fields
    if (!account_number || !products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: "Account number and products are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Re-validate account number server-side
    const { data: customer, error: custError } = await supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, business_name, full_address, phone, email, stop_credit")
      .eq("account_number", account_number.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (custError || !customer) {
      return new Response(
        JSON.stringify({ error: "Invalid account number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (customer.stop_credit) {
      return new Response(
        JSON.stringify({ error: "Account is on stop credit" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerName = customer.company_name || customer.business_name ||
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";

    // Calculate totals
    let subtotal = 0;
    const sanitizedProducts = products.map((p: any) => {
      const qty = Math.max(1, Math.floor(Number(p.quantity) || 1));
      const price = Math.max(0, Number(p.price) || 0);
      subtotal += price * qty;
      return {
        id: p.id,
        name: p.name,
        price,
        quantity: qty,
        unit: p.unit || "each",
      };
    });

    const orderNumber = generateOrderNumber();
    const finalDeliveryAddress = delivery_method === "pickup" 
      ? (customer.full_address || "Pickup") 
      : (delivery_address || customer.full_address || "");

    // Read fuel surcharge from payment_settings
    let fuelSurcharge = 0;
    if (delivery_method !== "pickup") {
      const { data: ps } = await supabase
        .from("payment_settings")
        .select("fuel_surcharge")
        .single();
      fuelSurcharge = Math.max(0, Number(ps?.fuel_surcharge) || 0);
    }

    const sanitizedDeliveryFee = Math.max(0, Number(delivery_fee) || 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customer.id,
        customer_name: customerName,
        customer_phone: customer.phone || "",
        customer_address: customer.full_address || "",
        delivery_address: finalDeliveryAddress,
        products: sanitizedProducts,
        subtotal,
        total_amount: subtotal + sanitizedDeliveryFee,
        delivery_fee: sanitizedDeliveryFee,
        fuel_surcharge: fuelSurcharge,
        status: "requested",
        payment_status: "unpaid",
        payment_method: payment_method || "account",
        delivery_method: delivery_method || "delivery",
        delivery_date: delivery_date || null,
        delivery_time: delivery_time || null,
        special_instructions: special_instructions || null,
        order_notes: order_notes || null,
        delivery_suburb_id: suburb_id || null,
        placed_via: "storefront",
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
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
