import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are the SwiftDispatch Pro AI Assistant — an internal helper for staff (admins, super admins, drivers) at a landscape supply / delivery business.

# Your role
Answer staff questions about how the app works AND look up real business data using the tools provided. Be concise, accurate, and friendly. Use Australian conventions (DD/MM/YYYY dates, AUD currency).

# App overview
SwiftDispatch Pro manages orders, customers, deliveries, trucks, drivers, payments and reporting for a delivery business. It has:
- **Admin dashboard** (admin & super_admin): full management — orders, customers, products, payments, fleet, suburbs, reports, settings.
- **Driver portal** (driver): drivers see only deliveries assigned to them.
- **Customer portal** (account_customer): PIN-only login, customers see their own orders/statements.
- **Public storefront**: customers can place orders without an account.

# Roles & permissions
- Priority: super_admin > admin > driver > account_customer.
- super_admin: manages all users including admins.
- admin: manages drivers only.
- Public sign-up is disabled — accounts created by admins only.

# Order numbering
- Format: \`MO-XXXX\` (Master Order).
- Split orders use suffixes: \`MO-1234-A\`, \`MO-1234-B\`, etc.
- Creator initials are appended to order numbers.

# Order types & colors (UI)
- Account customer orders → green
- Trade orders → blue
- Residential orders → white

# Order statuses
pending → confirmed → loading → out_for_delivery → delivered → completed (or cancelled).
Status update emails are sent ONLY when status changes to "loading".

# Split orders
- An order can be split into multiple deliveries (different trucks, dates, addresses).
- Each split has its own delivery address, suburb, date/time, and delivery fee.
- Delivery fee per split is calculated sequentially based on its suburb.
- Quantities support 3 decimal places. +/- buttons step by 1.
- Backorders: items moved into a new linked order; delivery date/time reset to null.

# Delivery
- Delivery fee = suburb base rate + global markup (configured in business settings).
- Time slots: 30min and 1h windows between 7AM–4PM. 1h slots are stored with prefix "1h-".
- Customer address is the billing address; delivery address can differ (empty by default, with "copy from customer" option).

# Customers
- Required fields differ for individuals vs businesses.
- Display name priority: if entity_type='business' → use business_name, else use first_name + last_name.
- 5-digit auto-incrementing account_number.
- Phone search uses strict start/end matching (min 4 digits) — never loose contains.

# Payments
- Methods include card, bank transfer, account (invoice), and COD (Cash on Delivery, no surcharge).
- Payment status separate from order status.

# Integrations
- **MYOB**: one-way push of invoices from app to MYOB (no webhook back). Configurable in Settings.
- **Google Sheets**: orders sync to the active monthly tab when enabled.
- **WooCommerce**: product sync.

# Receipts & statements
- Receipts include logo, 4-column product table, totals breakdown (Price Adj, Subtotal, Delivery, Sale Total, Surcharge, GST, Total), kerbside disclaimer and signature.
- Monthly customer statements grouped by address, with aging summary and bank details.

# Tool use rules
- Use the tools whenever a user asks about specific real records (an order number, a customer name, a suburb, today's deliveries, stock, etc.).
- Don't speculate about data — call a tool and report what you find.
- If a tool returns nothing, say so clearly.
- Never expose secrets, PINs, or internal IDs unless explicitly relevant.
- Format dates as DD/MM/YYYY and money as $X.XX AUD.

Keep replies short and scannable. Use markdown (bullets, **bold**, tables) where helpful.`;

const tools = [
  {
    name: "search_orders",
    description: "Search orders by order number, customer name, or phone. Returns up to 20 matches with key fields.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Order number (e.g. MO-1234), customer name, or phone digits" },
        status: { type: "string", description: "Optional status filter (pending, confirmed, loading, out_for_delivery, delivered, completed, cancelled)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_order",
    description: "Get full details of one order by order_number, including any split siblings.",
    input_schema: {
      type: "object",
      properties: { order_number: { type: "string" } },
      required: ["order_number"],
    },
  },
  {
    name: "search_customers",
    description: "Search customers by name, business name, phone, email, or account number.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_customer_summary",
    description: "Get a customer's profile, recent 10 orders, and outstanding (unpaid) total. Pass account_number or full name.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "search_products",
    description: "Search products by name or SKU. Returns price and stock level.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_suburb_fee",
    description: "Look up the delivery rate for a suburb by name.",
    input_schema: {
      type: "object",
      properties: { suburb_name: { type: "string" } },
      required: ["suburb_name"],
    },
  },
  {
    name: "list_deliveries_for_date",
    description: "List orders scheduled for delivery on a specific date (YYYY-MM-DD). Optionally filter by driver name.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD; use today's date if user says 'today'" },
        driver_name: { type: "string" },
      },
      required: ["date"],
    },
  },
  {
    name: "get_business_settings",
    description: "Get non-secret business settings (name, contact, address, integration toggles).",
    input_schema: { type: "object", properties: {} },
  },
];

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTool(name: string, input: any): Promise<any> {
  try {
    switch (name) {
      case "search_orders": {
        const q = (input.query ?? "").trim();
        let builder = admin.from("orders").select("order_number,customer_name,status,total_amount,delivery_date,delivery_time,delivery_address,is_split_order,payment_status").is("deleted_at", null).order("created_at", { ascending: false }).limit(20);
        if (input.status) builder = builder.eq("status", input.status);
        if (/^MO-/i.test(q)) builder = builder.ilike("order_number", `${q}%`);
        else if (/^\d{4,}$/.test(q.replace(/\D/g, ""))) {
          const digits = q.replace(/\D/g, "");
          builder = builder.or(`customer_phone.ilike.${digits}%,customer_phone.ilike.%${digits}`);
        } else builder = builder.ilike("customer_name", `%${q}%`);
        const { data, error } = await builder;
        if (error) throw error;
        return data;
      }
      case "get_order": {
        const num = input.order_number?.trim();
        const { data: master, error } = await admin.from("orders").select("*").ilike("order_number", num).is("deleted_at", null).maybeSingle();
        if (error) throw error;
        if (!master) return { found: false };
        let splits: any[] = [];
        if (master.is_split_order || master.master_order_id) {
          const masterId = master.master_order_id ?? master.id;
          const { data: sib } = await admin.from("orders").select("order_number,delivery_address,delivery_date,delivery_time,status,total_amount,delivery_fee,products").or(`id.eq.${masterId},master_order_id.eq.${masterId}`).is("deleted_at", null);
          splits = sib ?? [];
        }
        return { order: master, splits };
      }
      case "search_customers": {
        const q = (input.query ?? "").trim();
        const digits = q.replace(/\D/g, "");
        let builder = admin.from("customers").select("id,first_name,last_name,business_name,entity_type,email,phone,account_number,full_address,customer_type,is_active").limit(20);
        if (/^\d{5}$/.test(q)) builder = builder.eq("account_number", q);
        else if (digits.length >= 4 && digits === q) builder = builder.or(`phone.ilike.${digits}%,phone.ilike.%${digits}`);
        else builder = builder.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,business_name.ilike.%${q}%,email.ilike.%${q}%`);
        const { data, error } = await builder;
        if (error) throw error;
        return data;
      }
      case "get_customer_summary": {
        const q = (input.query ?? "").trim();
        let custQ = admin.from("customers").select("*").limit(1);
        if (/^\d{5}$/.test(q)) custQ = custQ.eq("account_number", q);
        else custQ = custQ.or(`business_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
        const { data: cust } = await custQ.maybeSingle();
        if (!cust) return { found: false };
        const { data: orders } = await admin.from("orders").select("order_number,status,payment_status,total_amount,delivery_date,created_at").eq("customer_id", cust.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(10);
        const { data: unpaid } = await admin.from("orders").select("total_amount").eq("customer_id", cust.id).is("deleted_at", null).neq("payment_status", "paid");
        const outstanding = (unpaid ?? []).reduce((s, o: any) => s + Number(o.total_amount || 0), 0);
        return { customer: cust, recent_orders: orders, outstanding_balance: outstanding };
      }
      case "search_products": {
        const q = (input.query ?? "").trim();
        const { data, error } = await admin.from("products").select("id,name,sku,price,stock_quantity,is_active").or(`name.ilike.%${q}%,sku.ilike.%${q}%`).limit(20);
        if (error) throw error;
        return data;
      }
      case "get_suburb_fee": {
        const q = (input.suburb_name ?? "").trim();
        const { data, error } = await admin.from("suburbs").select("name,state,delivery_rate,postcode").ilike("name", `%${q}%`).limit(10);
        if (error) throw error;
        const { data: settings } = await admin.from("business_settings").select("*").limit(1).maybeSingle();
        return { suburbs: data, note: "Final delivery fee = suburb delivery_rate + global markup from settings (if configured)." };
      }
      case "list_deliveries_for_date": {
        let builder = admin.from("orders").select("order_number,customer_name,delivery_address,delivery_time,status,driver_name,truck_registration,total_amount").eq("delivery_date", input.date).is("deleted_at", null).order("delivery_time").limit(50);
        if (input.driver_name) builder = builder.ilike("driver_name", `%${input.driver_name}%`);
        const { data, error } = await builder;
        if (error) throw error;
        return data;
      }
      case "get_business_settings": {
        const { data } = await admin.from("business_settings").select("business_name,business_email,business_phone,business_address,business_website,abn").limit(1).maybeSingle();
        return data;
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authErr } = await supabaseAuth.auth.getClaims(token);
    if (authErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Agentic loop: handle tool calls server-side, then stream the final response.
    let convo: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }));
    const MAX_TOOL_ROUNDS = 6;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          tools,
          messages: convo,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.error("Anthropic error", resp.status, t);
        const status = resp.status === 429 ? 429 : resp.status === 401 ? 401 : 500;
        const msg = resp.status === 429 ? "Rate limit reached. Please try again shortly." : resp.status === 401 ? "AI provider authentication failed. Please check ANTHROPIC_API_KEY." : "AI provider error.";
        return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await resp.json();
      const stopReason = result.stop_reason;
      const contentBlocks = result.content ?? [];

      if (stopReason === "tool_use") {
        // Run all tool_use blocks, append assistant turn + user tool_result turn.
        convo.push({ role: "assistant", content: contentBlocks });
        const toolResults: any[] = [];
        for (const block of contentBlocks) {
          if (block.type === "tool_use") {
            const out = await runTool(block.name, block.input ?? {});
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(out).slice(0, 20000),
            });
          }
        }
        convo.push({ role: "user", content: toolResults });
        continue;
      }

      // Final answer — extract text and return.
      const text = contentBlocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      return new Response(JSON.stringify({ reply: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ reply: "I needed more steps than allowed to answer that. Could you rephrase or narrow your question?" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
