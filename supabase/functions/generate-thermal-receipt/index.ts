import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateThermalReceiptRequest {
  invoiceId?: string;
  orderId?: string;
  receiptData?: any;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [THERMAL-RECEIPT] ${step}${detailsStr}`);
};

// Helper function to escape special Unicode characters to HTML entities
const escapeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/²/g, '&sup2;')
    .replace(/³/g, '&sup3;')
    .replace(/°/g, '&deg;')
    .replace(/±/g, '&plusmn;')
    .replace(/×/g, '&times;')
    .replace(/÷/g, '&divide;');
};

const encodeToBase64 = (str: string): string => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  } catch (error) {
    logStep('Base64 encoding failed', { error: error.message });
    throw new Error('Failed to encode content for download');
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = `thermal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep('Starting thermal receipt generation', { requestId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('Missing environment variables', { requestId });
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { invoiceId, orderId, receiptData }: GenerateThermalReceiptRequest = await req.json()

    logStep('Processing thermal receipt request', { invoiceId, orderId, requestId });

    // Fetch business settings
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('business_name, business_email, business_phone, business_address, abn')
      .single()

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
        const { data: suburb } = await supabase
          .from('suburbs')
          .select('name')
          .eq('id', suburbId)
          .single();
        suburbName = suburb?.name || null;
      }
    } else if (invoiceId) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
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
        `)
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoiceData) {
        logStep('Invoice fetch error', { error: invoiceError, requestId });
        throw new Error('Invoice not found')
      }

      invoice = invoiceData;
      order = invoiceData.orders;

      if (order.delivery_suburb_id) {
        const { data: suburb } = await supabase
          .from('suburbs')
          .select('name')
          .eq('id', order.delivery_suburb_id)
          .single()
        suburbName = suburb?.name || null;
      }
    } else if (orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
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
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        logStep('Order fetch error', { error: orderError, requestId });
        throw new Error('Order not found')
      }

      order = orderData;

      if (order.delivery_suburb_id) {
        const { data: suburb } = await supabase
          .from('suburbs')
          .select('name')
          .eq('id', order.delivery_suburb_id)
          .single()
        suburbName = suburb?.name || null;
      }
      
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()

      if (existingInvoice) {
        invoice = existingInvoice;
      }
    } else {
      throw new Error('Either invoiceId, orderId, or receiptData must be provided')
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

    const receiptHtml = generateThermalReceiptHTML({
      invoice,
      order,
      businessSettings,
      suburbName,
      creatorInitials,
      requestId
    })

    logStep('Thermal HTML receipt generated', { 
      size: receiptHtml.length,
      requestId 
    });

    try {
      const base64Html = encodeToBase64(receiptHtml);
      const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;
      
      const responseReceiptData = {
        html: receiptHtml,
        invoiceNumber: invoice?.invoice_number || null,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        amount: invoice?.amount || order.total_amount,
        generatedAt: new Date().toISOString(),
        requestId,
        isThermal: true
      }

      logStep('Thermal receipt generated successfully', { 
        size: receiptHtml.length,
        requestId 
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          receiptData: responseReceiptData,
          downloadUrl,
          filename: `thermal-receipt-${invoice?.invoice_number || order.order_number}.html`,
          contentType: 'text/html',
          size: receiptHtml.length
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } catch (encodingError: any) {
      logStep('Encoding error', { 
        error: encodingError.message,
        requestId 
      });
      
      return new Response(
        JSON.stringify({ 
          success: true,
          receiptData: {
            html: receiptHtml,
            invoiceNumber: invoice?.invoice_number || null,
            orderNumber: order.order_number,
            isThermal: true
          },
          downloadUrl: null,
          filename: `thermal-receipt-${invoice?.invoice_number || order.order_number}.html`,
          contentType: 'text/html',
          fallbackMode: true,
          message: 'Download generated in fallback mode'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  } catch (error: any) {
    logStep('Error in thermal receipt generation', { 
      error: error.message,
      stack: error.stack,
      requestId 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate thermal receipt',
        requestId,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

function generateThermalReceiptHTML(data: any): string {
  const { invoice, order, businessSettings, suburbName, creatorInitials, requestId } = data
  const orderItems = order.products || []
  
  // Business details
  const businessName = businessSettings?.business_name || 'Surrey Hills Garden Supplies'
  const businessAddress = businessSettings?.business_address || '680 Canterbury Rd, Surrey Hills, 3127'
  const businessPhone = businessSettings?.business_phone || '03 9890 3901'
  const businessAbn = businessSettings?.abn || '44 788 796 653'
  
  // Calculate totals
  const totalAmount = invoice?.amount || order.total_amount || 0
  const deliveryFee = order.delivery_fee || 0
  const gstAmount = totalAmount / 11
  
  // Format dates - support both snake_case (database) and camelCase (receiptData)
  const invoiceDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU') : (order.orderDate || new Date().toLocaleDateString('en-AU'))
  
  // Get delivery date - support both naming conventions
  const deliveryDateRaw = order.delivery_date || order.deliveryDate || ''
  const deliveryDate = deliveryDateRaw ? new Date(deliveryDateRaw).toLocaleDateString('en-AU') : ''
  
  // Format delivery time (convert 24h to 12h format) - support both naming conventions
  const formatTime = (time: string): string => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }
  const deliveryTimeRaw = order.delivery_time || order.deliveryTime || ''
  const deliveryTime = deliveryTimeRaw ? formatTime(deliveryTimeRaw) : ''
  
  // Format delivery address - support both naming conventions
  const deliveryAddress = order.delivery_address || order.deliveryAddress || order.customer_address || ''
  const deliveryDateTimeLine = [deliveryDate, deliveryTime].filter(Boolean).join(' at ')
  
  // Contact info - support both naming conventions
  const contactName = order.contact_name || order.contactName || order.customer_name || order.customerName || ''
  const contactPhone = order.contact_phone || order.contactPhone || order.customer_phone || order.customerPhone || ''
  
  // Delivery notes - support both naming conventions
  const deliveryNotes = order.delivery_notes || order.deliveryNotes || ''
  
  // Order notes - support both naming conventions
  const orderNotes = order.order_notes || order.orderNotes || ''
  
  // Purchase order - support both naming conventions
  const purchaseOrder = order.purchase_order || order.purchaseOrder || ''
  
  // Format order number with creator initials
  const orderNumber = order.order_number || order.orderNumber || ""
  const displayOrderNumber = orderNumber + (creatorInitials || "")
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice?.invoice_number || displayOrderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 11px;
      line-height: 1.2;
      color: #000;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
      padding: 3mm;
    }
    .thermal-receipt {
      width: 100%;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    
    .header {
      text-align: center;
      margin-bottom: 3mm;
      padding-bottom: 2mm;
      border-bottom: 1px dashed #000;
    }
    .header-logo {
      width: 40px;
      height: 40px;
      margin: 0 auto 2mm auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .business-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    .business-details {
      font-size: 9px;
      line-height: 1.3;
    }
    
    .invoice-info {
      margin: 2mm 0;
      font-size: 10px;
    }
    .invoice-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    
    .product-row {
      padding: 1.5mm 0;
      border-bottom: 1px dotted #999;
    }
    .product-name {
      font-weight: bold;
      font-size: 10px;
    }
    .product-details {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
    }
    
    .totals {
      margin-top: 2mm;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      font-size: 10px;
    }
    .total-row.grand {
      font-weight: bold;
      font-size: 12px;
      border-top: 1px solid #000;
      padding-top: 1mm;
      margin-top: 2mm;
    }
    .total-row.gst {
      font-size: 9px;
      font-style: italic;
    }
    
    .notes-section {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 1px dashed #000;
    }
    .notes-box {
      border: 1px solid #000;
      padding: 3mm;
      margin: 1.5mm 0;
      min-height: 20mm;
      height: auto;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.4;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .notes-label {
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 1mm;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 1px dashed #000;
      text-align: center;
    }
    .footer-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 1mm;
    }
    .footer-text {
      font-size: 8px;
      font-style: italic;
      line-height: 1.2;
    }
    
    @media print {
      body { 
        width: 80mm !important;
        margin: 0 !important;
        padding: 2mm !important;
      }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="thermal-receipt">
    <!-- Header -->
    <div class="header">
      <div class="header-logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTIwIj48cGF0aCBmaWxsPSIjMjI4QjIyIiBkPSJNNTAgMTBjLTE1IDAtMjUgMTUtMjUgMzBzMTAgMjAgMjUgMjAgMjUtNSAyNS0yMFM2NSAxMCA1MCAxMHoiLz48cGF0aCBmaWxsPSIjMUE2QjFBIiBkPSJNMzUgMjVjLTEyIDgtMTggMjAtMTUgMzUgMyAxMCAxMiAxOCAyNSAyMC01LTUtMTAtMTUtOC0yNSAyLTEwIDgtMjAgMTMtMjUtOC0yLTE1LTMtMTUtNXoiLz48cGF0aCBmaWxsPSIjMjg5QzI4IiBkPSJNNjUgMjVjMTIgOCAxOCAyMCAxNSAzNS0zIDEwLTEyIDE4LTI1IDIwIDUtNSAxMC0xNSA4LTI1LTItMTAtOC0yMC0xMy0yNSA4LTIgMTUtMyAxNS01eiIvPjxyZWN0IGZpbGw9IiM4QjQ1MTMiIHg9IjQ1IiB5PSI3MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjQwIiByeD0iMiIvPjxlbGxpcHNlIGZpbGw9IiMyMjhCMjIiIGN4PSI1MCIgY3k9IjE1IiByeD0iMTIiIHJ5PSI4Ii8+PGVsbGlwc2UgZmlsbD0iIzFBNkIxQSIgY3g9IjM1IiBjeT0iMjUiIHJ4PSIxMCIgcnk9IjciLz48ZWxsaXBzZSBmaWxsPSIjMjg5QzI4IiBjeD0iNjUiIGN5PSIyNSIgcng9IjEwIiByeT0iNyIvPjxlbGxpcHNlIGZpbGw9IiMxQTZCMUEiIGN4PSIyOCIgY3k9IjQwIiByeD0iOCIgcnk9IjYiLz48ZWxsaXBzZSBmaWxsPSIjMjg5QzI4IiBjeD0iNzIiIGN5PSI0MCIgcng9IjgiIHJ5PSI2Ii8+PC9zdmc+" alt="Logo"></div>
      <div class="business-name">${businessName}</div>
      <div class="business-details">
        ${businessAddress}<br>
        Ph: ${businessPhone} | ABN: ${businessAbn}
      </div>
    </div>
    
    <!-- Invoice Info -->
    <div class="invoice-info">
      <div class="invoice-row">
        <span class="bold">Tax Invoice No:</span>
        <span>${invoice?.invoice_number || order.order_number}</span>
      </div>
      <div class="invoice-row">
        <span>Date:</span>
        <span>${invoiceDate}</span>
      </div>
      ${deliveryDateTimeLine ? `
      <div class="invoice-row">
        <span>Scheduled:</span>
        <span>${deliveryDateTimeLine}</span>
      </div>
      ` : ''}
      ${deliveryAddress ? `
      <div style="margin-top: 1mm; font-size: 9px;">
        <span class="bold">Address:</span> ${deliveryAddress}
      </div>
      ` : ''}
    </div>
    
    <div class="divider"></div>
    
    <!-- Products -->
    ${orderItems.map((item: any) => {
      const itemName = escapeHtmlEntities(item.name || item.product_name || 'Product')
      const itemPrice = Number(item.price || item.unit_price || 0)
      const itemQty = item.quantity || 1
      const lineTotal = itemPrice * itemQty
      
      return `
    <div class="product-row">
      <div class="product-name">${itemName}</div>
      <div class="product-details">
        <span>Qty: ${itemQty}</span>
        <span>$${lineTotal.toFixed(2)}</span>
      </div>
    </div>`
    }).join('')}
    
    <!-- Totals -->
    <div class="totals">
      ${deliveryFee > 0 ? `
      <div class="total-row">
        <span>Delivery${suburbName ? ` (${suburbName})` : ''}</span>
        <span>$${deliveryFee.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="total-row grand">
        <span>TOTAL</span>
        <span>$${totalAmount.toFixed(2)}</span>
      </div>
      <div class="total-row gst">
        <span>GST included</span>
        <span>$${gstAmount.toFixed(2)}</span>
      </div>
    </div>
    
    <!-- Notes -->
    <div class="notes-section">
      <div class="notes-box">
        <div class="notes-label">Delivery notes:</div>
        ${deliveryNotes}
      </div>
      <div class="notes-box">
        <div class="notes-label">Order notes:</div>
        ${purchaseOrder ? `<strong>PO: ${purchaseOrder}</strong>` : ''}${purchaseOrder && orderNotes ? '<br>' : ''}${orderNotes}
      </div>
      <div class="notes-box">
        <div class="notes-label">Contact:</div>
        ${contactName}${contactPhone ? ` / ${contactPhone}` : ''}
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-title">Delivery Times are indicative</div>
      <div class="footer-text">
        Delivery times are not guaranteed. We take no responsibility for damage, loss or injury caused to the person or property of the customer.
      </div>
    </div>
  </div>
</body>
</html>`
}

serve(handler)
