import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateReceiptRequest {
  invoiceId?: string;
  sessionId?: string;
  orderId?: string;
  receiptData?: any;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [GENERATE-RECEIPT] ${step}${detailsStr}`);
};

// Helper function to escape special Unicode characters to HTML entities
const escapeHtmlEntities = (str: string): string => {
  if (!str) return str;
  return str
    // Handle curly/smart apostrophes
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    // Handle curly/smart quotes  
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    // Handle en/em dashes
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    // Handle ellipsis
    .replace(/…/g, '...')
    // Handle superscripts and math symbols
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

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep('Starting receipt generation', { requestId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('Missing environment variables', { requestId });
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { invoiceId, sessionId, orderId, receiptData }: GenerateReceiptRequest = await req.json()

    logStep('Processing receipt request', { invoiceId, sessionId, orderId, requestId });

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
      logStep('Using provided receipt data', { requestId });
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

      // Fetch suburb name if available
      if (order.delivery_suburb_id) {
        const { data: suburb } = await supabase
          .from('suburbs')
          .select('name')
          .eq('id', order.delivery_suburb_id)
          .single()
        suburbName = suburb?.name || null;
      }
      
      logStep('Invoice data retrieved', { 
        invoiceNumber: invoice.invoice_number,
        orderNumber: order.order_number,
        requestId 
      });
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

      // Fetch suburb name if available
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
      
      logStep('Order data retrieved', { 
        orderNumber: order.order_number,
        hasInvoice: !!invoice,
        requestId 
      });
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

    const receiptHtml = generateReceiptHTML({
      invoice,
      order,
      businessSettings,
      suburbName,
      creatorInitials,
      sessionId,
      requestId
    })

    logStep('HTML receipt generated', { 
      size: receiptHtml.length,
      requestId 
    });

    try {
      const base64Html = encodeToBase64(receiptHtml);
      const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;
      
      logStep('Base64 encoding successful', { 
        originalSize: receiptHtml.length,
        encodedSize: base64Html.length,
        requestId 
      });

      const responseReceiptData = {
        html: receiptHtml,
        invoiceNumber: invoice?.invoice_number || null,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        amount: invoice?.amount || order.total_amount,
        generatedAt: new Date().toISOString(),
        sessionId,
        requestId
      }

      logStep('Receipt generated successfully', { 
        size: receiptHtml.length,
        requestId 
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          receiptData: responseReceiptData,
          downloadUrl,
          filename: `receipt-${invoice?.invoice_number || order.order_number}.html`,
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
            orderNumber: order.order_number
          },
          downloadUrl: null,
          filename: `receipt-${invoice?.invoice_number || order.order_number}.html`,
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
    logStep('Error in receipt generation', { 
      error: error.message,
      stack: error.stack,
      requestId 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate receipt',
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

function generateReceiptHTML(data: any): string {
  const { invoice, order, businessSettings, suburbName, creatorInitials, sessionId, requestId } = data
  const orderItems = order.products || []
  
  // Business details
  const businessName = businessSettings?.business_name || 'Surrey Hills Garden Supplies'
  const businessAddress = businessSettings?.business_address || '680 Canterbury Rd, Surrey Hills, 3127'
  const businessPhone = businessSettings?.business_phone || '03 9890 3901'
  const businessEmail = businessSettings?.business_email || 'sales@surreyhillsgardensupplies.com.au'
  const businessAbn = businessSettings?.abn || '44 788 796 653'
  
  // Calculate totals
  const totalAmount = invoice?.amount || order.total_amount || 0
  const deliveryFee = order.delivery_fee || 0
  const subtotal = order.subtotal || (totalAmount - deliveryFee)
  const adjustments = order.adjustments || 0
  const gstAmount = totalAmount / 11 // GST is 1/11 of GST-inclusive price
  
  // Calculate surcharge if applicable (from payment method)
  const paymentMethod = order.payment_method || order.paymentMethod || ''
  let surchargePercent = 0
  let surchargeAmount = 0
  if (paymentMethod === 'card_on_file' || paymentMethod === 'in_yard_card' || paymentMethod === 'account_card') {
    surchargePercent = 1.2
    // Surcharge is typically on the pre-surcharge amount
    const preSurchargeTotal = subtotal + deliveryFee + adjustments
    surchargeAmount = preSurchargeTotal * (surchargePercent / 100)
  }
  const saleTotal = subtotal + deliveryFee + adjustments
  
  // Format timestamp for top of receipt
  const now = new Date()
  const timestamp = now.toLocaleDateString('en-AU') + ', ' + now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
  
  // Format dates - support both snake_case (database) and camelCase (receiptData)
  const invoiceDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU') : (order.orderDate || new Date().toLocaleDateString('en-AU'))
  
  // Get delivery date with day name - support both naming conventions
  const deliveryDateRaw = order.delivery_date || order.deliveryDate || ''
  const formatDateWithDay = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[date.getDay()]
    const formatted = date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    return `${formatted} ${dayName}`
  }
  const deliveryDateFormatted = formatDateWithDay(deliveryDateRaw)
  
  // Format delivery time range (e.g., "11:00am - 12:00pm")
  const formatTimeRange = (time: string): string => {
    if (!time) return ''
    // Check for special time slots
    if (time.toLowerCase() === 'urgent' || time.toLowerCase() === 'asap' || time.toLowerCase() === 'any time') {
      return time
    }
    // Handle time range format "HH:MM - HH:MM"
    if (time.includes(' - ')) {
      const [start, end] = time.split(' - ')
      const formatSingleTime = (t: string): string => {
        const [hours, minutes] = t.split(':')
        const hour = parseInt(hours)
        const ampm = hour >= 12 ? 'pm' : 'am'
        const hour12 = hour % 12 || 12
        return `${hour12}:${minutes}${ampm}`
      }
      return `${formatSingleTime(start)} - ${formatSingleTime(end)}`
    }
    // Single time format
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes}${ampm}`
  }
  const deliveryTimeRaw = order.delivery_time || order.deliveryTime || ''
  const deliveryTimeFormatted = formatTimeRange(deliveryTimeRaw)
  
  // Format delivery address - support both naming conventions
  const deliveryAddress = order.delivery_address || order.deliveryAddress || order.customer_address || ''
  
  // Customer/Business name
  const customerName = order.customer_name || order.customerName || ''
  const businessCustomerName = order.business_name || order.company_name || ''
  
  // Contact info - support both naming conventions
  const contactName = order.contact_name || order.contactName || order.customer_name || order.customerName || ''
  const contactPhone = order.contact_phone || order.contactPhone || order.customer_phone || order.customerPhone || ''
  
  // Delivery notes - support both naming conventions
  const deliveryNotes = order.delivery_notes || order.deliveryNotes || ''
  
  // Order notes - support both naming conventions
  const orderNotes = order.order_notes || order.orderNotes || ''
  
  // Purchase order - support both naming conventions
  const purchaseOrder = order.purchase_order || order.purchaseOrder || ''
  
  // Format payment method display
  const getPaymentMethodDisplay = (method: string): string => {
    const methodMap: { [key: string]: string } = {
      'cash': 'CASH',
      'cod': 'C.O.D',
      'card_on_file': 'CARD',
      'invoice': 'INVOICE',
      '7_day_invoice': '7 DAY INVOICE',
      'in_yard_cash': 'CASH (YARD)',
      'in_yard_card': 'CARD (YARD)',
      'account_cash': 'ACCOUNT - CASH',
      'account_card': 'ACCOUNT - CARD'
    }
    return methodMap[method] || method?.toUpperCase() || ''
  }
  
  // Customer type display
  const customerType = order.customer_type || ''
  const getCustomerTypeDisplay = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'account': 'ACCOUNT',
      'trade': 'TRADE',
      'residential': 'CASH'
    }
    return typeMap[type] || type?.toUpperCase() || 'CASH'
  }
  
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
    
    /* Accent color for highlights */
    .accent { color: #C65D00; }
    .accent-red { color: #C41E3A; }
    
    /* Timestamp */
    .timestamp {
      font-size: 11px;
      margin-bottom: 10px;
    }
    
    /* Header */
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
    .business-info {
      flex: 1;
    }
    .business-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .business-details {
      font-size: 11px;
      line-height: 1.4;
    }
    .abn-section {
      font-size: 11px;
      text-align: right;
      padding-top: 5px;
    }
    
    /* Invoice details */
    .invoice-details {
      margin-bottom: 10px;
    }
    .invoice-row {
      display: flex;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .invoice-label {
      font-weight: bold;
      min-width: 130px;
    }
    .invoice-value {
      flex: 1;
    }
    
    /* Products table */
    .products-header {
      display: flex;
      font-weight: bold;
      padding: 8px 0;
      border-bottom: 1px solid #000;
      font-size: 11px;
    }
    .products-header .col-name { flex: 2; }
    .products-header .col-qty { width: 50px; text-align: center; }
    .products-header .col-unit { width: 70px; text-align: right; }
    .products-header .col-price { width: 80px; text-align: right; }
    
    .product-row {
      display: flex;
      padding: 6px 0;
      border-bottom: 1px dotted #999;
      font-size: 11px;
    }
    .product-row .col-name { 
      flex: 2;
      padding-right: 10px;
    }
    .product-row .col-qty { 
      width: 50px; 
      text-align: center;
    }
    .product-row .col-unit { 
      width: 70px; 
      text-align: right;
    }
    .product-row .col-price { 
      width: 80px; 
      text-align: right;
    }
    
    /* Totals section */
    .totals-section {
      margin-top: 15px;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      padding: 3px 0;
      font-size: 11px;
    }
    .total-label {
      width: 120px;
      text-align: left;
    }
    .total-value {
      width: 80px;
      text-align: right;
    }
    .total-row.grand-total {
      font-weight: bold;
      font-size: 13px;
      border-top: 2px solid #000;
      margin-top: 5px;
      padding-top: 8px;
    }
    .total-row.grand-total .total-label,
    .total-row.grand-total .total-value {
      color: #C41E3A;
    }
    .total-row.gst {
      font-style: italic;
      font-size: 10px;
    }
    
    /* Notes section - new layout */
    .notes-section {
      margin-top: 20px;
      display: flex;
      gap: 15px;
    }
    .notes-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .notes-right {
      flex: 1;
    }
    .notes-box {
      border: 1px solid #000;
      padding: 10px;
      min-height: 60px;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .notes-box.tall {
      min-height: 130px;
      height: auto;
    }
    .notes-box-label {
      font-weight: bold;
      margin-bottom: 6px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .notes-box-content {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }
    
    /* Footer disclaimer */
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
      body { 
        padding: 0; 
        margin: 0; 
      }
      .receipt-container { 
        max-width: none; 
      }
      @page {
        size: A4;
        margin: 15mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Timestamp -->
    <div class="timestamp">${timestamp}</div>
    
    <!-- Header with Logo and Business Info -->
    <div class="header">
      <div class="logo"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTIwIj48cGF0aCBmaWxsPSIjMjI4QjIyIiBkPSJNNTAgMTBjLTE1IDAtMjUgMTUtMjUgMzBzMTAgMjAgMjUgMjAgMjUtNSAyNS0yMFM2NSAxMCA1MCAxMHoiLz48cGF0aCBmaWxsPSIjMUE2QjFBIiBkPSJNMzUgMjVjLTEyIDgtMTggMjAtMTUgMzUgMyAxMCAxMiAxOCAyNSAyMC01LTUtMTAtMTUtOC0yNSAyLTEwIDgtMjAgMTMtMjUtOC0yLTE1LTMtMTUtNXoiLz48cGF0aCBmaWxsPSIjMjg5QzI4IiBkPSJNNjUgMjVjMTIgOCAxOCAyMCAxNSAzNS0zIDEwLTEyIDE4LTI1IDIwIDUtNSAxMC0xNSA4LTI1LTItMTAtOC0yMC0xMy0yNSA4LTIgMTUtMyAxNS01eiIvPjxyZWN0IGZpbGw9IiM4QjQ1MTMiIHg9IjQ1IiB5PSI3MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjQwIiByeD0iMiIvPjxlbGxpcHNlIGZpbGw9IiMyMjhCMjIiIGN4PSI1MCIgY3k9IjE1IiByeD0iMTIiIHJ5PSI4Ii8+PGVsbGlwc2UgZmlsbD0iIzFBNkIxQSIgY3g9IjM1IiBjeT0iMjUiIHJ4PSIxMCIgcnk9IjciLz48ZWxsaXBzZSBmaWxsPSIjMjg5QzI4IiBjeD0iNjUiIGN5PSIyNSIgcng9IjEwIiByeT0iNyIvPjxlbGxpcHNlIGZpbGw9IiMxQTZCMUEiIGN4PSIyOCIgY3k9IjQwIiByeD0iOCIgcnk9IjYiLz48ZWxsaXBzZSBmaWxsPSIjMjg5QzI4IiBjeD0iNzIiIGN5PSI0MCIgcng9IjgiIHJ5PSI2Ii8+PC9zdmc+" alt="Surrey Hills Garden Supplies"></div>
      <div class="business-info">
        <div class="business-name">${businessName.toUpperCase()}</div>
        <div class="business-details">
          680 Canterbury Rd, <span class="accent">Surrey Hills</span><br>
          PH: ${businessPhone}<br>
          E: <span class="accent">${businessEmail}</span>
        </div>
      </div>
      <div class="abn-section">ABN: ${businessAbn}</div>
    </div>
    
    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="invoice-row">
        <span class="invoice-label">Tax Invoice No:</span>
        <span class="invoice-value">${invoice?.invoice_number || displayOrderNumber}</span>
        <span class="invoice-label" style="width: 50px;">Date:</span>
        <span class="invoice-value">${invoiceDate}</span>
      </div>
      ${businessCustomerName ? `
      <div class="invoice-row">
        <span class="invoice-label">Business Name:</span>
        <span class="invoice-value">${businessCustomerName}</span>
      </div>
      ` : ''}
      <div class="invoice-row">
        <span class="invoice-label">Delivery Address:</span>
        <span class="invoice-value">${deliveryAddress}</span>
      </div>
      ${deliveryDateFormatted ? `
      <div class="invoice-row">
        <span class="invoice-label">Delivery Date:</span>
        <span class="invoice-value accent-red">${deliveryDateFormatted}</span>
      </div>
      ` : ''}
      ${deliveryTimeFormatted ? `
      <div class="invoice-row">
        <span class="invoice-label">Delivery Time:</span>
        <span class="invoice-value accent-red">${deliveryTimeFormatted}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- Products Table -->
    <div class="products-header">
      <span class="col-name">Product</span>
      <span class="col-qty">Qty</span>
      <span class="col-unit">Unit</span>
      <span class="col-price">Price</span>
    </div>
    
    ${orderItems.map((item: any) => {
      const itemName = escapeHtmlEntities(item.name || item.product_name || 'Product')
      const itemPrice = Number(item.price || item.unit_price || 0)
      const itemQty = item.quantity || 1
      const lineTotal = itemPrice * itemQty
      
      return `
    <div class="product-row">
      <span class="col-name">${itemName}</span>
      <span class="col-qty">${itemQty}</span>
      <span class="col-unit">$${itemPrice.toFixed(2)}</span>
      <span class="col-price">$${lineTotal.toFixed(2)}</span>
    </div>`
    }).join('')}
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="total-row">
        <span class="total-label accent">Price Adjustment</span>
        <span class="total-value">$${adjustments.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-value">$${subtotal.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label">Delivery${suburbName ? ` (${suburbName})` : ''}</span>
        <span class="total-value">$${deliveryFee.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label">Sale Total</span>
        <span class="total-value">$${saleTotal.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span class="total-label accent">Surcharge ${surchargePercent}%</span>
        <span class="total-value">$${surchargeAmount.toFixed(2)}</span>
      </div>
      
      <div class="total-row gst">
        <span class="total-label">GST included</span>
        <span class="total-value">$${gstAmount.toFixed(2)}</span>
      </div>
      
      <div class="total-row grand-total">
        <span class="total-label">Total</span>
        <span class="total-value">$${totalAmount.toFixed(2)}</span>
      </div>
    </div>
    
    <!-- Notes Section - New Layout -->
    <div class="notes-section">
      <div class="notes-left">
        <div class="notes-box">
          <div class="notes-box-label">CASH / ACCOUNT / TRADE Etc:</div>
          <div class="notes-box-content">${getCustomerTypeDisplay(customerType)}</div>
        </div>
        <div class="notes-box">
          <div class="notes-box-label">Contact Name/ Phone No:</div>
          <div class="notes-box-content">${contactName}${contactPhone ? `<br>${contactPhone}` : ''}</div>
        </div>
      </div>
      <div class="notes-right">
        <div class="notes-box tall">
          <div class="notes-box-label">Notes:</div>
          <div class="notes-box-content">
            ${getPaymentMethodDisplay(paymentMethod)}
            ${purchaseOrder ? `<br><strong>PO: ${purchaseOrder}</strong>` : ''}
            ${deliveryNotes ? `<br>${deliveryNotes}` : ''}
            ${orderNotes ? `<br>${orderNotes}` : ''}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer Disclaimer -->
    <div class="footer">
      <div class="disclaimer-title">Delivery Times are indicative</div>
      <div class="disclaimer-text">
        Delivery times are not guaranteed. We take no responsibility for damage, loss or injury caused to the person or property of the customer arising out of order, delivery of goods or installation of goods, beyond the purchase price of goods delivered.
      </div>
    </div>
  </div>
</body>
</html>`
}

serve(handler)
