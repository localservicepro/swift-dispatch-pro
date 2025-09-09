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

    const receiptHtml = generateThermalReceiptHTML({
      invoice,
      order,
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
  const { invoice, order, requestId } = data
  const orderItems = order.products || []
  const isOrderReceipt = !invoice
  const isPaidOrder = order.payment_status === 'paid' || invoice?.status === 'paid'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thermal Receipt - ${invoice?.invoice_number || order.order_number}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px;
      line-height: 1.2;
      color: #000;
      background: #fff;
      width: 58mm; /* Standard thermal paper width */
      margin: 0 auto;
      padding: 2mm;
    }
    .thermal-receipt {
      width: 100%;
      max-width: 54mm;
    }
    .center { 
      text-align: center; 
    }
    .bold { 
      font-weight: bold; 
    }
    .large { 
      font-size: 14px; 
    }
    .small { 
      font-size: 10px; 
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
      width: 100%;
    }
    .header {
      margin-bottom: 3mm;
    }
    .company-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    .receipt-type {
      font-size: 14px;
      font-weight: bold;
      margin: 2mm 0;
    }
    .status-line {
      font-weight: bold;
      margin: 2mm 0;
      padding: 1mm;
      border: 1px solid #000;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      width: 100%;
    }
    .item-line {
      margin: 1mm 0;
      font-size: 11px;
    }
    .item-name {
      font-weight: bold;
    }
    .item-qty-price {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    .total-section {
      margin-top: 3mm;
      border-top: 2px solid #000;
      padding-top: 2mm;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      font-weight: bold;
    }
    .subtotal-line {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
      font-size: 10px;
    }
    .footer {
      margin-top: 3mm;
      border-top: 1px dashed #000;
      padding-top: 2mm;
      font-size: 10px;
    }
    
    /* Print optimizations for thermal printers */
    @media print {
      body { 
        width: 58mm !important;
        margin: 0 !important;
        padding: 1mm !important;
        font-size: 11px !important;
      }
      .thermal-receipt {
        width: 100% !important;
        max-width: none !important;
      }
      @page {
        size: 58mm auto;
        margin: 0;
      }
    }
    
    /* ESC/POS compatible styles */
    .esc-pos-bold {
      font-weight: bold;
      text-decoration: underline;
    }
    .esc-pos-center {
      text-align: center;
    }
    .esc-pos-double-height {
      font-size: 150%;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div class="thermal-receipt">
    <!-- Header -->
    <div class="header center">
      <div class="company-name">SwiftDispatch Pro</div>
      <div class="receipt-type">${isOrderReceipt ? (isPaidOrder ? 'PAYMENT RECEIPT' : 'ORDER RECEIPT') : 'INVOICE RECEIPT'}</div>
    </div>
    
    <div class="divider"></div>
    
    <!-- Status -->
    <div class="status-line center">
      ${isPaidOrder ? '✓ PAYMENT CONFIRMED' : `⏳ ${order.payment_status?.toUpperCase() || 'PENDING'}`}
    </div>
    
    <div class="divider"></div>
    
    <!-- Receipt Info -->
    <div class="info-line">
      <span>Receipt #:</span>
      <span class="bold">${invoice?.invoice_number || order.order_number}</span>
    </div>
    <div class="info-line">
      <span>Order #:</span>
      <span class="bold">${order.order_number}</span>
    </div>
    <div class="info-line">
      <span>Date:</span>
      <span>${new Date(order.created_at).toLocaleDateString()}</span>
    </div>
    <div class="info-line">
      <span>Time:</span>
      <span>${new Date(order.created_at).toLocaleTimeString()}</span>
    </div>
    
    <div class="divider"></div>
    
    <!-- Customer Info -->
    <div class="center bold">CUSTOMER</div>
    <div class="center">${order.customer_name}</div>
    ${order.customer_address ? `<div class="center small">${order.customer_address}</div>` : ''}
    
    <div class="divider"></div>
    
    <!-- Items -->
    ${orderItems.length > 0 ? `
      <div class="center bold">ITEMS</div>
      ${orderItems.map((item: any) => `
        <div class="item-line">
          <div class="item-name">${item.name || 'Product'}</div>
          <div class="item-qty-price">
            <span>Qty: ${item.quantity || 1}</span>
            <span>$${(item.price || 0).toFixed(2)}</span>
          </div>
        </div>
      `).join('')}
      
      <div class="divider"></div>
    ` : ''}
    
    <!-- Totals -->
    <div class="total-section">
      ${order.subtotal ? `
        <div class="subtotal-line">
          <span>Subtotal:</span>
          <span>$${order.subtotal.toFixed(2)}</span>
        </div>
      ` : ''}
      ${order.delivery_fee ? `
        <div class="subtotal-line">
          <span>Delivery:</span>
          <span>$${order.delivery_fee.toFixed(2)}</span>
        </div>
      ` : ''}
      ${order.adjustments && order.adjustments !== 0 ? `
        <div class="subtotal-line">
          <span>Adjustments:</span>
          <span>${order.adjustments > 0 ? '+' : ''}$${order.adjustments.toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="total-line large">
        <span>TOTAL:</span>
        <span>$${(invoice?.amount || order.total_amount || 0).toFixed(2)}</span>
      </div>
      
      ${order.payment_method ? `
        <div class="info-line">
          <span>Payment:</span>
          <span>${order.payment_method}</span>
        </div>
      ` : ''}
    </div>
    
    <div class="divider"></div>
    
    <!-- Footer -->
    <div class="footer center">
      <div class="bold">Thank you!</div>
      <div class="small">Generated: ${new Date().toLocaleString()}</div>
      <div class="small">ID: ${requestId}</div>
    </div>
  </div>
</body>
</html>`
}

serve(handler)