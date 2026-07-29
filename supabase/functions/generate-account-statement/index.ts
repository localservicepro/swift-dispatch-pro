import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateStatementRequest {
  customerId: string;
  startDate: string;
  endDate: string;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [ACCOUNT-STATEMENT] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep("Starting account statement generation", { requestId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing environment variables");
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { customerId, startDate, endDate }: GenerateStatementRequest = await req.json();

    logStep("Processing statement request", { customerId, startDate, endDate, requestId });

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, company_name, business_name, first_name, last_name, email, phone, full_address, customer_type")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      throw new Error("Customer not found");
    }

    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, business_email, business_phone, business_address, abn, business_website")
      .single();

    // Fetch delivered orders (exclude back_order from statement table)
    const { data: allOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id, order_number, myob_invoice_number, created_at, delivery_date, pickup_date,
        delivery_method, status, total_amount, payment_status, delivery_address
      `)
      .eq("customer_id", customerId)
      .eq("status", "delivered")
      .is("deleted_at", null)
      .order("delivery_date", { ascending: true });

    if (ordersError) {
      throw new Error("Failed to fetch orders");
    }

    // Filter by date range
    const orders = (allOrders || []).filter((order: any) => {
      const orderDate = order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date;
      return orderDate && orderDate >= startDate && orderDate <= endDate;
    });

    logStep("Fetched orders", { total: allOrders?.length || 0, filtered: orders.length, requestId });

    // Fetch unpaid delivered orders for aging
    const { data: allUnpaidOrders } = await supabase
      .from("orders")
      .select("id, total_amount, delivery_date, pickup_date, delivery_method, payment_status, status")
      .eq("customer_id", customerId)
      .eq("status", "delivered")
      .eq("payment_status", "pending")
      .is("deleted_at", null);

    const today = new Date();
    const agingBuckets = { current: 0, over30: 0, over60: 0, over90: 0 };

    (allUnpaidOrders || []).forEach((order: any) => {
      const orderDate = order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date;
      if (!orderDate) return;
      const daysOld = Math.floor((today.getTime() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(order.total_amount || 0);
      if (daysOld > 90) agingBuckets.over90 += amount;
      else if (daysOld > 60) agingBuckets.over60 += amount;
      else if (daysOld > 30) agingBuckets.over30 += amount;
      else agingBuckets.current += amount;
    });

    const agingTotal = agingBuckets.current + agingBuckets.over30 + agingBuckets.over60 + agingBuckets.over90;

    const statementHtml = generateStatementHTML({
      customer, orders: orders || [], businessSettings,
      startDate, endDate, agingBuckets, agingTotal,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(statementHtml);
    let binary = "";
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64Html = btoa(binary);
    const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;

    const customerName = customer.company_name || customer.business_name ||
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

    return new Response(
      JSON.stringify({
        success: true, downloadUrl,
        filename: `statement-${customerName.replace(/\s+/g, '-')}-${startDate.substring(0, 7)}.pdf`,
        orderCount: orders?.length || 0,
        generatedAt: new Date().toISOString(), requestId,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    logStep("Error", { error: error.message, requestId });
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate statement", requestId }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

function generateStatementHTML(data: any): string {
  const { customer, orders, businessSettings, startDate, endDate, agingBuckets, agingTotal } = data;

  const businessName = businessSettings?.business_name || "Surrey Hills Garden Supplies";
  const businessAddress = businessSettings?.business_address || "680 Canterbury Road, Surrey Hills Vic. 3127";
  const businessPhone = businessSettings?.business_phone || "03 9890 3901";
  const businessEmail = businessSettings?.business_email || "sales@surreyhillsgardensupplies.com.au";
  const businessAbn = businessSettings?.abn || "44 788 796 653";
  const businessWebsite = businessSettings?.business_website || "www.surreyhillsgardensupplies.com.au";

  const customerName = customer.company_name || customer.business_name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  const customerAddress = customer.full_address || "";

  const formatDateAU = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getStatementPeriod = (start: string): string => {
    const d = new Date(start);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const statementPeriod = getStatementPeriod(startDate);
  const generatedDate = formatDateAU(new Date().toISOString());

  // Build rows with running balance - exclude back_order
  const deliveredOrders = orders.filter((o: any) => o.status !== 'back_order');

  // Group orders by delivery address
  const addressGroups: Record<string, any[]> = {};
  deliveredOrders.forEach((order: any) => {
    const addr = order.delivery_address || "No Address";
    if (!addressGroups[addr]) addressGroups[addr] = [];
    addressGroups[addr].push(order);
  });

  let runningBalance = 0;
  const addressSections = Object.entries(addressGroups).map(([address, groupOrders]) => {
    const rows = groupOrders.map((order: any) => {
      const fulfillmentDate = order.delivery_method === 'pickup' ? order.pickup_date : order.delivery_date;
      const dateStr = fulfillmentDate ? formatDateAU(fulfillmentDate) : formatDateAU(order.created_at);
      const invoiceNo = order.myob_invoice_number || (order.order_number || "").replace(/^ORD-/i, "");
      const amount = Number(order.total_amount || 0);
      const isPaid = order.payment_status === "paid";

      let chargesCol = "";
      let paymentsCol = "";

      if (isPaid) {
        chargesCol = `$${amount.toFixed(2)}`;
        paymentsCol = `$${amount.toFixed(2)}`;
      } else {
        chargesCol = `$${amount.toFixed(2)}`;
        paymentsCol = "";
        runningBalance += amount;
      }

      return `<tr>
        <td>${dateStr}</td>
        <td>${invoiceNo}</td>
        <td class="text-right">${chargesCol}</td>
        <td class="text-right">${paymentsCol}</td>
        <td class="text-right">$${runningBalance.toFixed(2)}</td>
      </tr>`;
    }).join("");

    return `<div class="address-group">
      <div class="address-header">${address}</div>
      <table class="statement-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice No.</th>
            <th class="text-right">Charges</th>
            <th class="text-right">Payments</th>
            <th class="text-right">Balance Due</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join("");

  // Totals
  let totalCharges = 0;
  let totalPayments = 0;
  deliveredOrders.forEach((order: any) => {
    const amount = Number(order.total_amount || 0);
    totalCharges += amount;
    if (order.payment_status === "paid") {
      totalPayments += amount;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statement - ${customerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
    .header-left { flex: 1; }
    .business-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .business-details { font-size: 10px; line-height: 1.5; }
    .header-right { text-align: right; }
    .statement-label { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .statement-date { font-size: 11px; }

    .customer-section { margin: 15px 0; padding: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .customer-name { font-weight: bold; font-size: 13px; }
    .customer-address { font-size: 11px; margin-top: 2px; }

    .period-info { margin: 10px 0 15px; font-size: 11px; }

    .address-group { margin-bottom: 20px; }
    .address-header { font-weight: bold; font-size: 12px; padding: 6px 0 4px; border-bottom: 1px solid #999; margin-bottom: 0; }

    table.statement-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    table.statement-table th {
      background: #e8e8e8; font-weight: bold; padding: 6px 8px;
      border-top: 2px solid #000; border-bottom: 1px solid #000;
      font-size: 11px;
    }
    table.statement-table td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    table.statement-table .text-right { text-align: right; }

    .totals-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .totals-table td { font-weight: bold; padding: 6px 8px; border-top: 2px solid #000; font-size: 11px; }
    .totals-table .grand-total td { font-size: 13px; border-top: 2px solid #000; }
    .totals-table .text-right { text-align: right; }

    .aging-section { margin-top: 25px; }
    .aging-title { font-weight: bold; font-size: 12px; margin-bottom: 8px; }
    .aging-table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
    .aging-table th { background: #333; color: #fff; padding: 8px 10px; text-align: center; border: 1px solid #000; font-size: 11px; }
    .aging-table td { padding: 8px 10px; text-align: center; border: 1px solid #000; font-size: 12px; font-weight: bold; }
    .aging-table .aging-total { background: #f5f5f5; font-size: 13px; color: #C65D00; }

    .payment-info { margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; font-size: 10px; line-height: 1.6; }
    .payment-info strong { font-size: 11px; }

    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; padding-top: 10px; border-top: 1px solid #ddd; }

    .no-orders { text-align: center; padding: 30px; font-size: 12px; color: #666; }

    @media print {
      body { padding: 0; margin: 0; }
      .container { max-width: none; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <div class="business-name">${businessName}</div>
        <div class="business-details">
          ${businessAddress}<br>
          Sales Ph: ${businessPhone}<br>
          Email: ${businessEmail}<br>
          Web: ${businessWebsite}<br>
          ABN: ${businessAbn}
        </div>
      </div>
      <div class="header-right">
        <div class="statement-label">STATEMENT</div>
        <div class="statement-date">${generatedDate}</div>
      </div>
    </div>

    <div class="customer-section">
      <div class="customer-name">${customerName}</div>
      ${customerAddress ? `<div class="customer-address">${customerAddress}</div>` : ''}
    </div>

    <div class="period-info">
      <strong>Statement Period:</strong> ${statementPeriod}
    </div>

    ${deliveredOrders.length > 0 ? `
    ${addressSections}

    <table class="totals-table">
      <tbody>
        <tr>
          <td colspan="2"><strong>Totals</strong></td>
          <td class="text-right">$${totalCharges.toFixed(2)}</td>
          <td class="text-right">$${totalPayments.toFixed(2)}</td>
          <td class="text-right"></td>
        </tr>
        <tr class="grand-total">
          <td colspan="4" class="text-right" style="color: #C65D00;">BALANCE DUE:</td>
          <td class="text-right" style="color: #C65D00; font-size: 14px;">$${runningBalance.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    ` : '<div class="no-orders">No orders found for this period.</div>'}

    <div class="aging-section">
      <div class="aging-title">Account Summary</div>
      <table class="aging-table">
        <thead>
          <tr>
            <th>Current</th>
            <th>Over 30 Days</th>
            <th>Over 60 Days</th>
            <th>Over 90 Days</th>
            <th>Total Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>$${agingBuckets.current.toFixed(2)}</td>
            <td>$${agingBuckets.over30.toFixed(2)}</td>
            <td>$${agingBuckets.over60.toFixed(2)}</td>
            <td>$${agingBuckets.over90.toFixed(2)}</td>
            <td class="aging-total">$${agingTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="payment-info">
      <strong>Payment:</strong> (NAB) Acc. Name: ${businessName} | BSB: 083 153 | Account No: 74 137 0674<br>
      Please include your Invoice No. as payment reference.<br>
      A 1.5% surcharge applies to credit/debit card payments.
    </div>

    <div class="footer">
      <p>This statement was generated on ${generatedDate}. Please contact us if you have any questions.</p>
      <p>Email: ${businessEmail} | Phone: ${businessPhone}</p>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);
