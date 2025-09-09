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
      .select('business_name, business_email, business_phone, business_address')
      .single()

    let invoice = null;
    let order = null;

    if (receiptData) {
      order = receiptData;
    } else if (invoiceId) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          orders!inner(
            id,
            order_number,
            customer_name,
            customer_address,
            products,
            total_amount,
            delivery_date,
            delivery_time,
            payment_status,
            payment_method,
            subtotal,
            delivery_fee,
            adjustments,
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
    } else if (orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
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
          created_at
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        logStep('Order fetch error', { error: orderError, requestId });
        throw new Error('Order not found')
      }

      order = orderData;
      
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

    // Generate simple HTML for PDF conversion
    const receiptHtml = generateSimpleReceiptHTML({
      invoice,
      order,
      businessSettings,
      requestId
    })

    logStep('Simple HTML receipt generated for PDF', { 
      size: receiptHtml.length,
      requestId 
    });

    // For now, return HTML as base64 data URL (PDF conversion will be added later)
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
  const { invoice, order, businessSettings, requestId } = data
  
  // Handle different product data structures (supports snake_case and camelCase)
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
  
  // Use business name from settings or fallback
  const businessName = businessSettings?.business_name || 'Business Name'
  const isOrderReceipt = !invoice
  const isPaidOrder = (order.payment_status === 'paid' || order.paymentStatus === 'paid' || invoice?.status === 'paid')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${invoice?.invoice_number || order.invoiceNumber || order.order_number || order.orderNumber || 'N/A'}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }
    .receipt {
      width: 100%;
      max-width: 80mm;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .medium { font-size: 14px; }
    .small { font-size: 10px; }
    
    .header {
      text-align: center;
      margin-bottom: 5mm;
      border-bottom: 1px solid #000;
      padding-bottom: 3mm;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 2mm;
    }
    .receipt-title {
      font-size: 14px;
      font-weight: bold;
      margin: 2mm 0;
    }
    .decorative-border {
      text-align: center;
      margin: 2mm 0;
    }
    
    .status {
      text-align: center;
      font-weight: bold;
      margin: 3mm 0;
      padding: 2mm;
      border: 2px solid #000;
    }
    
    .info-section {
      margin: 3mm 0;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    
    .customer-section {
      text-align: center;
      margin: 3mm 0;
      border: 1px dashed #000;
      padding: 2mm;
    }
    
    .items-section {
      margin: 3mm 0;
    }
    .items-header {
      text-align: center;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding: 1mm;
      margin-bottom: 2mm;
    }
    .item {
      margin: 1mm 0;
      padding: 1mm;
    }
    .item-name {
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-top: 0.5mm;
    }
    
    .totals {
      margin-top: 5mm;
      border-top: 2px solid #000;
      padding-top: 2mm;
    }
    .subtotal-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      font-size: 11px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 2mm 0;
      font-weight: bold;
      font-size: 14px;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }
    
    .footer {
      margin-top: 8mm;
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 3mm;
      font-size: 10px;
    }
    
    @media print {
      body { 
        width: auto !important;
        margin: 0 !important;
        padding: 5mm !important;
      }
      @page {
        size: A4;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="company-name">${businessName.toUpperCase()}</div>
      <div class="decorative-border">* * * * * * * * * * * * * *</div>
      <div class="receipt-title">${isOrderReceipt ? (isPaidOrder ? 'PAYMENT RECEIPT' : 'ORDER RECEIPT') : 'INVOICE RECEIPT'}</div>
      <div class="decorative-border">* * * * * * * * * * * * * *</div>
    </div>
    
    <!-- Receipt Information -->
    <div class="info-section">
      <div class="info-line">
        <span>Receipt No:</span>
        <span class="bold">${invoice?.invoice_number || order.invoiceNumber || order.order_number || order.orderNumber || 'N/A'}</span>
      </div>
      <div class="info-line">
        <span>Order No:</span>
        <span class="bold">${order.order_number || order.orderNumber || 'N/A'}</span>
      </div>
      <div class="info-line">
        <span>Date:</span>
        <span>${order.created_at ? new Date(order.created_at).toLocaleDateString() : (order.orderDate || 'N/A')}</span>
      </div>
      <div class="info-line">
        <span>Time:</span>
        <span>${order.created_at ? new Date(order.created_at).toLocaleTimeString() : (order.orderTime || 'N/A')}</span>
      </div>
      ${(order.payment_method || order.paymentMethod) ? `
      <div class="info-line">
        <span>Payment:</span>
        <span>${order.payment_method || order.paymentMethod}</span>
      </div>
      ` : ''}
    </div>
    
    <!-- Customer -->
    <div class="customer-section">
      <div class="bold">CUSTOMER</div>
      <div>${(order.customer_name || order.customerName) || 'N/A'}</div>
      ${(order.customer_address || order.deliveryAddress) ? `<div class="small">${order.customer_address || order.deliveryAddress}</div>` : ''}
    </div>
    
    <!-- Items -->
    ${orderItems.length > 0 ? `
      <div class="items-section">
        <div class="items-header">ORDER ITEMS</div>
        ${orderItems.map((item: any) => {
          const itemName = item.name || item.product_name || 'Product'
          const itemPrice = (item.price ?? item.unit_price ?? item.unitPrice ?? 0)
          const itemQuantity = item.quantity || 1
          return `
          <div class="item">
            <div class="item-name">${itemName}</div>
            <div class="item-details">
              <span>Qty: ${itemQuantity}</span>
              <span>@ $${Number(itemPrice).toFixed(2)}</span>
              <span>$${(Number(itemPrice) * Number(itemQuantity)).toFixed(2)}</span>
            </div>
          </div>
          `
        }).join('')}
      </div>
    ` : '<div class="items-section"><div class="items-header">NO ITEMS</div></div>'}
    
    <!-- Totals -->
    <div class="totals">
      ${(order.subtotal ?? order.subTotal) ? `
        <div class="subtotal-line">
          <span>Subtotal:</span>
          <span>$${Number(order.subtotal ?? order.subTotal).toFixed(2)}</span>
        </div>
      ` : ''}
      ${((order.delivery_fee ?? order.deliveryFee) && Number(order.delivery_fee ?? order.deliveryFee) > 0) ? `
        <div class="subtotal-line">
          <span>Delivery Fee:</span>
          <span>$${Number(order.delivery_fee ?? order.deliveryFee).toFixed(2)}</span>
        </div>
      ` : ''}
      ${(order.adjustments && order.adjustments !== 0) ? `
        <div class="subtotal-line">
          <span>Adjustments:</span>
          <span>${order.adjustments > 0 ? '+' : ''}$${Number(order.adjustments).toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="total-line">
        <span>TOTAL:</span>
        <span>$${Number(invoice?.amount ?? order.total_amount ?? order.totalAmount ?? 0).toFixed(2)}</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="decorative-border">* * * * * * * * * * * * * *</div>
      <div class="bold">THANK YOU FOR YOUR BUSINESS!</div>
      <div class="decorative-border">* * * * * * * * * * * * * *</div>
      <div class="small">Generated: ${new Date().toLocaleString()}</div>
      <div class="small">Receipt ID: ${requestId.slice(-8)}</div>
    </div>
  </div>
</body>
</html>`
}

serve(handler)