import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFReceiptRequest {
  invoiceId?: string;
  orderId?: string;
  receiptData?: any;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [PDF-RECEIPT] ${step}${detailsStr}`);
};

// Helper function to escape special Unicode characters to HTML entities
const escapeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    // Handle curly/smart apostrophes using Unicode code points
    .replace(/\u2018/g, "'")  // Left single quote '
    .replace(/\u2019/g, "'")  // Right single quote '
    .replace(/\u201A/g, "'")  // Single low-9 quote ‚
    .replace(/\u2032/g, "'")  // Prime ′
    // Handle curly/smart quotes using Unicode code points
    .replace(/\u201C/g, '"')  // Left double quote "
    .replace(/\u201D/g, '"')  // Right double quote "
    .replace(/\u201E/g, '"')  // Double low-9 quote „
    .replace(/\u2033/g, '"')  // Double prime ″
    // Handle en/em dashes
    .replace(/\u2013/g, '-')  // En dash –
    .replace(/\u2014/g, '-')  // Em dash —
    // Handle ellipsis
    .replace(/\u2026/g, '...')  // Ellipsis …
    // Handle superscripts and math symbols
    .replace(/\u00B2/g, '&sup2;')  // ²
    .replace(/\u00B3/g, '&sup3;')  // ³
    .replace(/\u00B0/g, '&deg;')   // °
    .replace(/\u00B1/g, '&plusmn;') // ±
    .replace(/\u00D7/g, '&times;')  // ×
    .replace(/\u00F7/g, '&divide;'); // ÷
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep("Starting PDF receipt generation", { requestId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("Missing environment variables", { requestId });
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { invoiceId, orderId, receiptData }: GeneratePDFReceiptRequest = await req.json();

    logStep("Processing PDF receipt request", { invoiceId, orderId, requestId });

    // Fetch business settings
    const { data: businessSettings } = await supabase
      .from("business_settings")
      .select("business_name, business_email, business_phone, business_address, abn")
      .single();

    let invoice = null;
    let order = null;
    let suburbName = null;
    let creatorInitials = "";

    if (receiptData) {
      order = receiptData;

      // Handle suburb from receiptData
      if (receiptData.suburbName) {
        suburbName = receiptData.suburbName;
      } else if (receiptData.deliverySuburbId || receiptData.delivery_suburb_id) {
        const suburbId = receiptData.deliverySuburbId || receiptData.delivery_suburb_id;
        const { data: suburb } = await supabase.from("suburbs").select("name").eq("id", suburbId).single();
        suburbName = suburb?.name || null;
      }
    } else if (invoiceId) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          orders!inner(
            id,
            order_number,
            purchase_order,
            order_notes,
            customer_name,
            customer_phone,
            customer_address,
            delivery_address,
            products,
            total_amount,
            delivery_date,
            delivery_time,
            payment_status,
            payment_method,
            subtotal,
            delivery_fee,
            adjustments,
            delivery_notes,
            contact_name,
            contact_phone,
            delivery_suburb_id,
            admin_id,
            created_at
          )
        `,
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError || !invoiceData) {
        logStep("Invoice fetch error", { error: invoiceError, requestId });
        throw new Error("Invoice not found");
      }

      invoice = invoiceData;
      order = invoiceData.orders;

      if (order.delivery_suburb_id) {
        const { data: suburb } = await supabase
          .from("suburbs")
          .select("name")
          .eq("id", order.delivery_suburb_id)
          .single();
        suburbName = suburb?.name || null;
      }
    } else if (orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          purchase_order,
          order_notes,
          customer_name,
          customer_phone,
          customer_address,
          delivery_address,
          products,
          total_amount,
          delivery_date,
          delivery_time,
          payment_status,
          payment_method,
          subtotal,
          delivery_fee,
          adjustments,
          delivery_notes,
          contact_name,
          contact_phone,
          delivery_suburb_id,
          admin_id,
          created_at
        `,
        )
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        logStep("Order fetch error", { error: orderError, requestId });
        throw new Error("Order not found");
      }

      order = orderData;

      if (order.delivery_suburb_id) {
        const { data: suburb } = await supabase
          .from("suburbs")
          .select("name")
          .eq("id", order.delivery_suburb_id)
          .single();
        suburbName = suburb?.name || null;
      }

      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (existingInvoice) {
        invoice = existingInvoice;
      }
    } else {
      throw new Error("Either invoiceId, orderId, or receiptData must be provided");
    }

    // Fetch creator profile for initials
    const adminId = order?.admin_id || order?.adminId;
    if (adminId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", adminId)
        .single();
      
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        creatorInitials = parts.map((p: string) => p.charAt(0).toUpperCase()).join("");
      }
    }

    const receiptHtml = generateSimpleReceiptHTML({
      invoice,
      order,
      businessSettings,
      suburbName,
      creatorInitials,
      requestId,
    });

    logStep("Simple HTML receipt generated for PDF", {
      size: receiptHtml.length,
      requestId,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(receiptHtml);
    let binary = "";
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64Html = btoa(binary);
    const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;

    const responseReceiptData = {
      html: receiptHtml,
      invoiceNumber: invoice?.invoice_number || order?.invoiceNumber || null,
      orderNumber: order.order_number || order.orderNumber,
      customerName: order.customer_name || order.customerName,
      amount: invoice?.amount || order.total_amount || order.totalAmount,
      generatedAt: new Date().toISOString(),
      requestId,
      isPDF: true,
    };

    logStep("PDF receipt generated successfully", {
      size: receiptHtml.length,
      requestId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        receiptData: responseReceiptData,
        downloadUrl,
        filename: `receipt-${invoice?.invoice_number || order.order_number}.pdf`,
        contentType: "application/pdf",
        size: receiptHtml.length,
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
    logStep("Error in PDF receipt generation", {
      error: error.message,
      stack: error.stack,
      requestId,
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate PDF receipt",
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

function generateSimpleReceiptHTML(data: any): string {
  const { invoice, order, businessSettings, suburbName, creatorInitials, requestId } = data;

  let orderItems = [] as any[];
  const products = order?.products ?? null;
  const items = order?.items ?? null;
  if (products) {
    if (Array.isArray(products)) {
      orderItems = products;
    } else {
      orderItems = [products];
    }
  } else if (Array.isArray(items)) {
    orderItems = items;
  }

  // Business details
  const businessName = businessSettings?.business_name || "Surrey Hills Garden Supplies";
  const businessAddress = businessSettings?.business_address || "680 Canterbury Rd, Surrey Hills, 3127";
  const businessPhone = businessSettings?.business_phone || "03 9890 3901";
  const businessEmail = businessSettings?.business_email || "sales@surreyhillsgardensupplies.com.au";
  const businessAbn = businessSettings?.abn || "44 788 796 653";

  // Calculate totals
  const totalAmount = invoice?.amount || order.total_amount || order.totalAmount || 0;
  const deliveryFee = order.delivery_fee || order.deliveryFee || 0;
  const subtotal = order.subtotal || order.subTotal || totalAmount - deliveryFee;
  const adjustments = order.adjustments || 0;
  const gstAmount = totalAmount / 11;

  // Calculate surcharge if applicable (from payment method)
  const paymentMethod = order.payment_method || order.paymentMethod || "";
  let surchargePercent = 0;
  let surchargeAmount = 0;
  if (
    paymentMethod === "card_on_file" ||
    paymentMethod === "in_yard_card" ||
    paymentMethod === "account_card" ||
    paymentMethod === "7_day_invoice"
  ) {
    surchargePercent = 1.2;
    const preSurchargeTotal = subtotal + deliveryFee + adjustments;
    surchargeAmount = preSurchargeTotal * (surchargePercent / 100);
  }
  const saleTotal = subtotal + deliveryFee + adjustments;

  // Format date as DD/MM/YYYY with leading zeros
  const formatDateAU = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format dates - support both snake_case (database) and camelCase (receiptData)
  const invoiceDate = order.created_at
    ? formatDateAU(new Date(order.created_at))
    : order.orderDate || formatDateAU(new Date());

  // Get delivery date with day name - support both naming conventions
  const deliveryDateRaw = order.delivery_date || order.deliveryDate || "";
  const getDayName = (dateStr: string): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };
  const deliveryDate = deliveryDateRaw
    ? `${formatDateAU(new Date(deliveryDateRaw))} ${getDayName(deliveryDateRaw)}`
    : "";

  // Format delivery time range (convert 24h to 12h format with +1 hour range)
  const formatTimeRange = (time: string): string => {
    if (!time) return "";
    
    // Handle special time values
    if (time === 'urgent') return 'Urgent';
    if (time === 'asap') return 'ASAP';
    if (time === 'anytime') return 'Any time';
    
    const [hours, minutes] = time.split(":");
    const startHour = parseInt(hours);
    const endHour = startHour + 1;
    
    const formatSingleTime = (h: number, m: string): string => {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${m} ${ampm}`;
    };
    
    return `${formatSingleTime(startHour, minutes)} - ${formatSingleTime(endHour, minutes)}`;
  };
  const deliveryTimeRaw = order.delivery_time || order.deliveryTime || "";
  const deliveryTime = deliveryTimeRaw ? formatTimeRange(deliveryTimeRaw) : "";

  // Format delivery address - support both naming conventions
  const deliveryAddress = order.delivery_address || order.deliveryAddress || order.customer_address || "";
  const deliveryDateTimeLine = [deliveryDate, deliveryTime].filter(Boolean).join(" at ");

  // Contact info - support both naming conventions
  const contactName = order.contact_name || order.contactName || order.customer_name || order.customerName || "";
  const contactPhone = order.contact_phone || order.contactPhone || order.customer_phone || order.customerPhone || "";

  // Delivery notes - support both naming conventions
  const deliveryNotes = order.delivery_notes || order.deliveryNotes || "";

  // Order notes - support both naming conventions
  const orderNotes = order.order_notes || order.orderNotes || "";

  // Purchase order - support both naming conventions
  const purchaseOrder = order.purchase_order || order.purchaseOrder || "";

  // Format payment method display
  const getPaymentMethodDisplay = (method: string): string => {
    const methodMap: { [key: string]: string } = {
      cash: "CASH",
      cod: "C.O.D",
      card_on_file: "CARD ON FILE",
      invoice: "INVOICE",
      "7_day_invoice": "7 DAY INVOICE",
      in_yard_cash: "CASH (YARD)",
      in_yard_card: "CARD (YARD)",
      account_cash: "ACCOUNT - CASH",
      account_card: "ACCOUNT - CARD",
    };
    return methodMap[method] || method?.toUpperCase() || "";
  };
  const paymentMethodDisplay = getPaymentMethodDisplay(paymentMethod);
  
  // Format order number with creator initials
  const orderNumber = order.order_number || order.orderNumber || "";
  const displayOrderNumber = orderNumber + (creatorInitials || "");
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice?.invoice_number || displayOrderNumber || "N/A"}</title>
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
    .receipt-container {
      max-width: 600px;
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
    
    .invoice-details { margin-bottom: 10px; }
    .invoice-row {
      display: flex;
      margin-bottom: 5px;
    }
    .invoice-label {
      font-weight: bold;
      min-width: 180px;
    }
    .invoice-value { flex: 1; }
    
    .products-header {
      display: flex;
      font-weight: bold;
      padding: 5px 0;
      border-bottom: 1px solid #000;
      margin-top: 15px;
    }
    .products-header .col-name { flex: 2; }
    .products-header .col-qty { width: 60px; text-align: center; }
    .products-header .col-unit { width: 80px; text-align: right; }
    .products-header .col-price { width: 80px; text-align: right; }
    
    .product-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #ccc;
    }
    .product-row .col-name { flex: 2; padding-right: 10px; }
    .product-row .col-qty { width: 60px; text-align: center; }
    .product-row .col-unit { width: 80px; text-align: right; }
    .product-row .col-price { width: 80px; text-align: right; }
    
    .accent { color: #C65D00; }
    
    .totals-section { margin-top: 15px; }
    .total-row {
      display: flex;
      justify-content: flex-end;
      padding: 5px 0;
    }
    .total-label { width: 150px; text-align: left; }
    .total-value { width: 100px; text-align: right; }
    .total-row.grand-total {
      font-weight: bold;
      font-size: 14px;
      border-top: 2px solid #000;
      margin-top: 5px;
      padding-top: 8px;
    }
    .total-row.gst {
      font-style: italic;
      font-size: 11px;
    }
    
    .notes-section {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .notes-box {
      border: 1px solid #000;
      padding: 12px;
      min-height: 100px;
      height: auto;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .notes-box-label {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 13px;
      text-transform: uppercase;
    }
    .notes-box-content { 
      font-size: 14px; 
      font-weight: 500;
      line-height: 1.5;
    }
    
    .footer {
      margin-top: 25px;
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 15px;
    }
    .disclaimer-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .disclaimer-text {
      font-style: italic;
      font-size: 10px;
      line-height: 1.4;
      max-width: 500px;
      margin: 0 auto;
    }
    
    @media print {
      body { padding: 0; margin: 0; }
      .receipt-container { max-width: none; }
      @page { size: A4; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
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
    
    <div class="invoice-details">
      <div class="invoice-row">
        <span class="invoice-label">Tax Invoice No:</span>
        <span class="invoice-value">${invoice?.invoice_number || displayOrderNumber || "N/A"}</span>
        <span class="invoice-label" style="width: 60px;">Date:</span>
        <span class="invoice-value accent">${invoiceDate}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label accent">Business Name:</span>
        <span class="invoice-value">${order.customer_name || order.customerName || ""}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">Delivery Address:</span>
        <span class="invoice-value" style="font-weight: bold;">${deliveryAddress}</span>
      </div>
      ${
        deliveryDateTimeLine
          ? `
      <div class="invoice-row">
        <span class="invoice-label">Scheduled Date & Time:</span>
        <span class="invoice-value accent">${deliveryDateTimeLine}</span>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="products-header">
      <span class="col-name">Product</span>
      <span class="col-qty">Qty</span>
      <span class="col-unit accent">Unit</span>
      <span class="col-price">Price</span>
    </div>
    
    ${orderItems
      .map((item: any) => {
        const itemName = escapeHtmlEntities(item.name || item.product_name || "Product");
        const itemPrice = Number(item.price ?? item.unit_price ?? item.unitPrice ?? 0);
        const itemQty = item.quantity || 1;
        const lineTotal = itemPrice * itemQty;

        return `
    <div class="product-row">
      <span class="col-name">${itemName}</span>
      <span class="col-qty">${itemQty}</span>
      <span class="col-unit accent">$${itemPrice.toFixed(2)}</span>
      <span class="col-price">$${lineTotal.toFixed(2)}</span>
    </div>`;
      })
      .join("")}
    
    <div class="totals-section">
      <div class="total-row">
        <span class="total-label accent">Price Adjustment</span>
        <span class="total-value">$${adjustments.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label accent">Subtotal</span>
        <span class="total-value">$${subtotal.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label">Delivery${suburbName ? ` (${suburbName})` : ""}</span>
        <span class="total-value">$${Number(deliveryFee).toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label"><span class="accent">Sale</span> Total</span>
        <span class="total-value">$${saleTotal.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label accent">Surcharge ${surchargePercent}%</span>
        <span class="total-value accent">$${surchargeAmount.toFixed(2)}</span>
      </div>
      
      <div class="total-row gst">
        <span class="total-label">GST included</span>
        <span class="total-value">$${gstAmount.toFixed(2)}</span>
      </div>
      
      <div class="total-row grand-total">
        <span class="total-label accent">Total</span>
        <span class="total-value accent">$${Number(totalAmount).toFixed(2)}</span>
      </div>
    </div>
    
    <div class="notes-section">
      <div class="notes-box">
        <div class="notes-box-label">Delivery notes:</div>
        <div class="notes-box-content">${deliveryNotes}</div>
      </div>
      <div class="notes-box">
        <div class="notes-box-label">Order notes:</div>
        <div class="notes-box-content">${paymentMethodDisplay ? `<strong>${paymentMethodDisplay}</strong><br>` : ""}${purchaseOrder ? `<strong>PO: ${purchaseOrder}</strong>` : ""}${(paymentMethodDisplay || purchaseOrder) && orderNotes ? "<br>" : ""}${orderNotes}</div>
      </div>
    </div>
    <div class="notes-section" style="margin-top: 10px;">
      <div class="notes-box">
        <div class="notes-box-label">Contact Info:</div>
        <div class="notes-box-content">
          <div><strong>Name:</strong> ${contactName || "N/A"}</div>
          <div><strong>Phone:</strong> ${contactPhone || "N/A"}</div>
        </div>
      </div>
      <div class="notes-box" style="visibility: hidden;"></div>
    </div>
    
    <div class="footer">
      <div class="disclaimer-title">Delivery Times are indicative</div>
      <div class="disclaimer-text">
        Delivery times are not guaranteed. We take no responsibility for damage, loss or injury caused to the person or property of the customer arising out of order, delivery of goods or installation of goods, beyond the purchase price of goods delivered.
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(handler);
