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

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing environment variables", { requestId });
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { customerId, startDate, endDate }: GenerateStatementRequest = await req.json();

    logStep("Processing statement request", { customerId, startDate, endDate, requestId });

    // Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, company_name, business_name, first_name, last_name, email, phone, full_address, customer_type")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      logStep("Customer fetch error", { error: customerError, requestId });
      throw new Error("Customer not found");
    }

    if (customer.customer_type !== "account") {
      throw new Error("Statement export is only available for account customers");
    }

    // Fetch business settings
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, business_email, business_phone, business_address, abn")
      .single();

    // Fetch orders for this customer in date range
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        created_at,
        status,
        products,
        subtotal,
        delivery_fee,
        adjustments,
        total_amount,
        payment_status,
        admin_id,
        profiles:admin_id(full_name)
      `)
      .eq("customer_id", customerId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (ordersError) {
      logStep("Orders fetch error", { error: ordersError, requestId });
      throw new Error("Failed to fetch orders");
    }

    logStep("Fetched orders", { count: orders?.length || 0, requestId });

    const statementHtml = generateStatementHTML({
      customer,
      orders: orders || [],
      businessSettings,
      startDate,
      endDate,
      requestId,
    });

    logStep("Statement HTML generated", { size: statementHtml.length, requestId });

    const encoder = new TextEncoder();
    const data = encoder.encode(statementHtml);
    let binary = "";
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64Html = btoa(binary);
    const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;

    const customerName = customer.company_name || customer.business_name || 
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl,
        filename: `statement-${customerName.replace(/\s+/g, '-')}-${startDate.substring(0, 7)}.pdf`,
        orderCount: orders?.length || 0,
        generatedAt: new Date().toISOString(),
        requestId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    logStep("Error in statement generation", {
      error: error.message,
      stack: error.stack,
      requestId,
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate statement",
        requestId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

function generateStatementHTML(data: any): string {
  const { customer, orders, businessSettings, startDate, endDate, requestId } = data;

  // Business details
  const businessName = businessSettings?.business_name || "Surrey Hills Garden Supplies";
  const businessAddress = businessSettings?.business_address || "680 Canterbury Rd, Surrey Hills, 3127";
  const businessPhone = businessSettings?.business_phone || "03 9890 3901";
  const businessEmail = businessSettings?.business_email || "sales@surreyhillsgardensupplies.com.au";
  const businessAbn = businessSettings?.abn || "44 788 796 653";

  // Customer name
  const customerName = customer.company_name || customer.business_name || 
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  // Format date as DD/MM/YYYY
  const formatDateAU = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get month/year for statement period
  const getStatementPeriod = (start: string, end: string): string => {
    const startDate = new Date(start);
    const months = ["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];
    return `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
  };

  const statementPeriod = getStatementPeriod(startDate, endDate);
  const generatedDate = formatDateAU(new Date().toISOString());

  // Get creator initials
  const getInitials = (fullName: string): string => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    return parts.map(p => p.charAt(0).toUpperCase()).join("");
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      requested: "Requested",
      preparing: "Preparing",
      loading: "Loading",
      en_route: "En Route",
      delivered: "Delivered",
      cancelled: "Cancelled",
      back_order: "Back Order",
    };
    return statusMap[status] || status;
  };

  // Calculate totals
  let ordersSubtotal = 0;
  let totalDeliveryFees = 0;
  let totalAdjustments = 0;
  let totalAmount = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let paidCount = 0;
  let pendingCount = 0;

  orders.forEach((order: any) => {
    ordersSubtotal += Number(order.subtotal || 0);
    totalDeliveryFees += Number(order.delivery_fee || 0);
    totalAdjustments += Number(order.adjustments || 0);
    totalAmount += Number(order.total_amount || 0);
    
    if (order.payment_status === "paid") {
      paidTotal += Number(order.total_amount || 0);
      paidCount++;
    } else {
      pendingTotal += Number(order.total_amount || 0);
      pendingCount++;
    }
  });

  const gstIncluded = totalAmount / 11;

  // Generate order rows
  const orderRows = orders.map((order: any) => {
    const orderDate = formatDateAU(order.created_at);
    const orderNumber = order.order_number || "";
    const creatorInitials = order.profiles?.full_name ? getInitials(order.profiles.full_name) : "";
    const displayOrderNumber = orderNumber + creatorInitials;
    const status = formatStatus(order.status);
    
    // Parse products
    const products = order.products || [];
    const items = Array.isArray(products) ? products : [products];
    const itemNames = items.map((p: any) => p.name || p.product_name || "Item").join(", ");
    const units = items.map((p: any) => p.quantity || 1).join(", ");
    const amount = Number(order.total_amount || 0).toFixed(2);

    return `
      <tr>
        <td>${orderDate}</td>
        <td>${displayOrderNumber}</td>
        <td><span class="status-badge status-${order.status}">${status}</span></td>
        <td class="items-cell">${itemNames}</td>
        <td class="text-center">${units}</td>
        <td class="text-right">$${amount}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Account Statement - ${customerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 15px;
    }
    .statement-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    .logo {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .business-info { flex: 1; }
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .business-details {
      font-size: 11px;
      line-height: 1.3;
    }
    
    .statement-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 20px 0;
      padding: 10px;
      background: #f5f5f5;
      border: 1px solid #000;
    }
    
    .statement-info {
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: bold;
      min-width: 150px;
    }
    .info-value { flex: 1; }
    .accent { color: #C65D00; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
      border-bottom: 2px solid #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .items-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-pending, .status-requested { background: #fff3cd; color: #856404; }
    .status-preparing, .status-loading, .status-en_route { background: #cce5ff; color: #004085; }
    .status-cancelled { background: #f8d7da; color: #721c24; }
    .status-back_order { background: #e2e3e5; color: #383d41; }
    
    .totals-section {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #000;
    }
    .totals-grid {
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .total-row.grand-total {
      font-weight: bold;
      font-size: 16px;
      border-top: 2px solid #000;
      margin-top: 10px;
      padding-top: 10px;
    }
    .total-row.gst {
      font-style: italic;
      font-size: 11px;
      color: #666;
    }
    
    .payment-summary {
      margin-top: 20px;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .payment-summary-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .paid { color: #155724; }
    .pending { color: #C65D00; }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    
    @media print {
      body { padding: 0; margin: 0; }
      .statement-container { max-width: none; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="statement-container">
    <div class="header">
      <div class="logo"><img src="https://wntcxbxitsanbyrtfhwv.supabase.co/storage/v1/object/public/product-images/Surrey-Hills-Logo.png" alt="Surrey Hills Garden Supplies"></div>
      <div class="business-info">
        <div class="business-name">${businessName}</div>
        <div class="business-details">
          ${businessAddress}<br>
          Ph: ${businessPhone}<br>
          E: ${businessEmail}<br>
          ABN: ${businessAbn}
        </div>
      </div>
    </div>
    
    <div class="statement-title">MONTHLY ACCOUNT STATEMENT</div>
    
    <div class="statement-info">
      <div class="info-row">
        <span class="info-label">Customer:</span>
        <span class="info-value"><strong>${customerName}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Statement Period:</span>
        <span class="info-value accent"><strong>${statementPeriod}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Generated:</span>
        <span class="info-value">${generatedDate}</span>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Order #</th>
          <th>Status</th>
          <th>Items</th>
          <th class="text-center">Units</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${orders.length > 0 ? orderRows : '<tr><td colspan="6" style="text-align: center; padding: 20px;">No orders found for this period.</td></tr>'}
      </tbody>
    </table>
    
    <div class="totals-section">
      <div class="totals-grid">
        <div class="totals-table">
          <div class="total-row">
            <span>Orders Subtotal:</span>
            <span>$${ordersSubtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>Delivery Fees:</span>
            <span>$${totalDeliveryFees.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="accent">Adjustments:</span>
            <span>$${totalAdjustments.toFixed(2)}</span>
          </div>
          <div class="total-row grand-total">
            <span class="accent">TOTAL DUE:</span>
            <span class="accent">$${totalAmount.toFixed(2)}</span>
          </div>
          <div class="total-row gst">
            <span>GST Included:</span>
            <span>$${gstIncluded.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="payment-summary">
      <div class="payment-summary-title">Payment Summary</div>
      <div class="payment-row">
        <span class="paid">Paid Orders (${paidCount}):</span>
        <span class="paid">$${paidTotal.toFixed(2)}</span>
      </div>
      <div class="payment-row">
        <span class="pending">Pending Orders (${pendingCount}):</span>
        <span class="pending">$${pendingTotal.toFixed(2)}</span>
      </div>
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
