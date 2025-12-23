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

    if (receiptData) {
      logStep('Using provided receipt data', { requestId });
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

    const receiptHtml = generateReceiptHTML({
      invoice,
      order,
      businessSettings,
      suburbName,
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
  const { invoice, order, businessSettings, suburbName, sessionId, requestId } = data
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
  const gstAmount = totalAmount / 11 // GST is 1/11 of GST-inclusive price
  
  // Format dates
  const invoiceDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-AU') : new Date().toLocaleDateString('en-AU')
  const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-AU') : ''
  const deliveryTime = order.delivery_time || ''
  
  // Format delivery address with date/time
  const deliveryAddress = order.delivery_address || order.customer_address || ''
  const deliveryDateTime = [deliveryDate, deliveryTime].filter(Boolean).join(' ')
  const deliveryAddressLine = [deliveryAddress, deliveryDateTime].filter(Boolean).join(', ')
  
  // Contact info
  const contactName = order.contact_name || order.customer_name || ''
  const contactPhone = order.contact_phone || order.customer_phone || ''
  
  // Delivery notes
  const deliveryNotes = order.delivery_notes || ''
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoice?.invoice_number || order.order_number}</title>
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
      font-size: 40px;
    }
    .business-info {
      flex: 1;
    }
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .business-details {
      font-size: 11px;
      line-height: 1.3;
    }
    
    /* Invoice details */
    .invoice-details {
      margin-bottom: 10px;
    }
    .invoice-row {
      display: flex;
      margin-bottom: 5px;
    }
    .invoice-label {
      font-weight: bold;
      min-width: 180px;
    }
    .invoice-value {
      flex: 1;
    }
    
    /* Products table */
    .products-table {
      width: 100%;
      margin: 15px 0;
      border-collapse: collapse;
    }
    .products-header {
      display: flex;
      font-weight: bold;
      padding: 5px 0;
      border-bottom: 1px solid #000;
    }
    .products-header .col-name { flex: 2; }
    .products-header .col-qty { width: 80px; text-align: center; }
    .products-header .col-price { width: 100px; text-align: right; }
    
    .product-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #ccc;
    }
    .product-row .col-name { 
      flex: 2;
      padding-right: 10px;
    }
    .product-row .col-qty { 
      width: 80px; 
      text-align: center;
    }
    .product-row .col-price { 
      width: 100px; 
      text-align: right;
    }
    
    /* Totals section */
    .totals-section {
      margin-top: 15px;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      padding: 5px 0;
    }
    .total-label {
      width: 150px;
      text-align: left;
    }
    .total-value {
      width: 100px;
      text-align: right;
    }
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
    
    /* Notes boxes */
    .notes-section {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .notes-box {
      border: 1px solid #000;
      padding: 8px;
      min-height: 60px;
    }
    .notes-box-label {
      font-weight: bold;
      margin-bottom: 5px;
      font-size: 11px;
    }
    .notes-box-content {
      font-size: 11px;
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
    <!-- Header with Logo and Business Info -->
    <div class="header">
      <div class="logo">🌳</div>
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
    
    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="invoice-row">
        <span class="invoice-label">Tax Invoice No:</span>
        <span class="invoice-value">${invoice?.invoice_number || order.order_number}</span>
        <span class="invoice-label" style="width: 60px;">Date:</span>
        <span class="invoice-value">${invoiceDate}</span>
      </div>
      <div class="invoice-row">
        <span class="invoice-label">Delivery Address, Date & Time:</span>
        <span class="invoice-value">${deliveryAddressLine}</span>
      </div>
    </div>
    
    <!-- Products Table -->
    <div class="products-header">
      <span class="col-name">Product</span>
      <span class="col-qty">Qty</span>
      <span class="col-price">Price</span>
    </div>
    
    ${orderItems.map((item: any) => {
      const itemName = item.name || item.product_name || 'Product'
      const itemPrice = Number(item.price || item.unit_price || 0)
      const itemQty = item.quantity || 1
      const lineTotal = itemPrice * itemQty
      
      return `
    <div class="product-row">
      <span class="col-name">${itemName}</span>
      <span class="col-qty">${itemQty}</span>
      <span class="col-price">$${lineTotal.toFixed(2)}</span>
    </div>`
    }).join('')}
    
    <!-- Totals Section -->
    <div class="totals-section">
      ${deliveryFee > 0 ? `
      <div class="total-row">
        <span class="total-label">Delivery${suburbName ? ` (${suburbName})` : ''}</span>
        <span class="total-value">$${deliveryFee.toFixed(2)}</span>
      </div>
      ` : ''}
      
      <div class="total-row grand-total">
        <span class="total-label">Total</span>
        <span class="total-value">$${totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="total-row gst">
        <span class="total-label">GST included</span>
        <span class="total-value">$${gstAmount.toFixed(2)}</span>
      </div>
    </div>
    
    <!-- Notes Section -->
    <div class="notes-section">
      <div class="notes-box">
        <div class="notes-box-label">Delivery notes:</div>
        <div class="notes-box-content">${deliveryNotes}</div>
      </div>
      <div class="notes-box">
        <div class="notes-box-label">Contact name/Phone No:</div>
        <div class="notes-box-content">${contactName}${contactPhone ? ` / ${contactPhone}` : ''}</div>
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
