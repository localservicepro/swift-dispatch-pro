import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePDFReceiptRequest {
  invoiceId?: string;
  orderId?: string;
  receiptData?: any;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [PDF-RECEIPT] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logStep('Starting PDF receipt generation', { requestId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('Missing environment variables', { requestId });
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { invoiceId, orderId, receiptData }: GeneratePDFReceiptRequest = await req.json()

    logStep('Processing PDF receipt request', { invoiceId, orderId, requestId });

    // Fetch business settings
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('business_name, business_email, business_phone, business_address, abn')
      .single()

    let invoice = null;
    let order = null;
    let suburbName = null;

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

    const receiptHtml = generateSimpleReceiptHTML({
      invoice,
      order,
      businessSettings,
      suburbName,
      requestId
    })

    logStep('Simple HTML receipt generated for PDF', { 
      size: receiptHtml.length,
      requestId 
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(receiptHtml);
    let binary = '';
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
      isPDF: true
    }

    logStep('PDF receipt generated successfully', { 
      size: receiptHtml.length,
      requestId 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        receiptData: responseReceiptData,
        downloadUrl,
        filename: `receipt-${invoice?.invoice_number || order.order_number}.pdf`,
        contentType: 'application/pdf',
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
  } catch (error: any) {
    logStep('Error in PDF receipt generation', { 
      error: error.message,
      stack: error.stack,
      requestId 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate PDF receipt',
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

function generateSimpleReceiptHTML(data: any): string {
  const { invoice, order, businessSettings, suburbName, requestId } = data
  
  let orderItems = [] as any[]
  const products = order?.products ?? null
  const items = order?.items ?? null
  if (products) {
    if (Array.isArray(products)) {
      orderItems = products
    } else {
      orderItems = [products]
    }
  } else if (Array.isArray(items)) {
    orderItems = items
  }
  
  // Business details
  const businessName = businessSettings?.business_name || 'Surrey Hills Garden Supplies'
  const businessAddress = businessSettings?.business_address || '680 Canterbury Rd, Surrey Hills, 3127'
  const businessPhone = businessSettings?.business_phone || '03 9890 3901'
  const businessEmail = businessSettings?.business_email || 'sales@surreyhillsgardensupplies.com.au'
  const businessAbn = businessSettings?.abn || '44 788 796 653'
  
  // Calculate totals
  const totalAmount = invoice?.amount || order.total_amount || order.totalAmount || 0
  const deliveryFee = order.delivery_fee || order.deliveryFee || 0
  const subtotal = order.subtotal || order.subTotal || (totalAmount - deliveryFee)
  const adjustments = order.adjustments || 0
  const gstAmount = totalAmount / 11
  
  // Calculate surcharge if applicable (from payment method)
  const paymentMethod = order.payment_method || order.paymentMethod || ''
  let surchargePercent = 0
  let surchargeAmount = 0
  if (paymentMethod === 'card_on_file' || paymentMethod === 'in_yard_card' || paymentMethod === 'account_card' || paymentMethod === '7_day_invoice') {
    surchargePercent = 1.2
    const preSurchargeTotal = subtotal + deliveryFee + adjustments
    surchargeAmount = preSurchargeTotal * (surchargePercent / 100)
  }
  const saleTotal = subtotal + deliveryFee + adjustments
  
  // Format dates - support both snake_case (database) and camelCase (receiptData)
  const invoiceDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU') : (order.orderDate || new Date().toLocaleDateString('en-AU'))
  
  // Get delivery date with day name - support both naming conventions
  const deliveryDateRaw = order.delivery_date || order.deliveryDate || ''
  const getDayName = (dateStr: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const date = new Date(dateStr)
    return days[date.getDay()]
  }
  const deliveryDate = deliveryDateRaw ? `${new Date(deliveryDateRaw).toLocaleDateString('en-AU')} ${getDayName(deliveryDateRaw)}` : ''
  
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
  
  // Format payment method display
  const getPaymentMethodDisplay = (method: string): string => {
    const methodMap: { [key: string]: string } = {
      'cash': 'CASH',
      'cod': 'C.O.D',
      'card_on_file': 'CARD ON FILE',
      'invoice': 'INVOICE',
      '7_day_invoice': '7 DAY INVOICE',
      'in_yard_cash': 'CASH (YARD)',
      'in_yard_card': 'CARD (YARD)',
      'account_cash': 'ACCOUNT - CASH',
      'account_card': 'ACCOUNT - CARD'
    }
    return methodMap[method] || method?.toUpperCase() || ''
  }
  const paymentMethodDisplay = getPaymentMethodDisplay(paymentMethod)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice?.invoice_number || order.invoiceNumber || order.order_number || order.orderNumber || 'N/A'}</title>
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
      <div class="logo"><img src="data:image/png;base64,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" alt="Surrey Hills Garden Supplies"></div>
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
        <span class="invoice-value">${invoice?.invoice_number || order.invoiceNumber || order.order_number || order.orderNumber || 'N/A'}</span>
        <span class="invoice-label" style="width: 60px;">Date:</span>
        <span class="invoice-value accent">${invoiceDate}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label accent">Business Name:</span>
        <span class="invoice-value">${order.customer_name || order.customerName || ''}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">Delivery Address:</span>
        <span class="invoice-value">${deliveryAddress}</span>
      </div>
      ${deliveryDateTimeLine ? `
      <div class="invoice-row">
        <span class="invoice-label">Scheduled Date & Time:</span>
        <span class="invoice-value accent">${deliveryDateTimeLine}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="products-header">
      <span class="col-name">Product</span>
      <span class="col-qty">Qty</span>
      <span class="col-unit accent">Unit</span>
      <span class="col-price">Price</span>
    </div>
    
    ${orderItems.map((item: any) => {
      const itemName = item.name || item.product_name || 'Product'
      const itemPrice = Number(item.price ?? item.unit_price ?? item.unitPrice ?? 0)
      const itemQty = item.quantity || 1
      const lineTotal = itemPrice * itemQty
      
      return `
    <div class="product-row">
      <span class="col-name">${itemName}</span>
      <span class="col-qty">${itemQty}</span>
      <span class="col-unit accent">$${itemPrice.toFixed(2)}</span>
      <span class="col-price">$${lineTotal.toFixed(2)}</span>
    </div>`
    }).join('')}
    
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
        <span class="total-label">Delivery${suburbName ? ` (${suburbName})` : ''}</span>
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
        <div class="notes-box-content">${paymentMethodDisplay ? `<strong>${paymentMethodDisplay}</strong><br>` : ''}${purchaseOrder ? `<strong>PO: ${purchaseOrder}</strong>` : ''}${(paymentMethodDisplay || purchaseOrder) && orderNotes ? '<br>' : ''}${orderNotes}</div>
      </div>
    </div>
    <div class="notes-section" style="margin-top: 10px;">
      <div class="notes-box">
        <div class="notes-box-label">Contact Info:</div>
        <div class="notes-box-content">
          <div><strong>Name:</strong> ${contactName || 'N/A'}</div>
          <div><strong>Phone:</strong> ${contactPhone || 'N/A'}</div>
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
</html>`
}

serve(handler)
