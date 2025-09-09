
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
  receiptData?: any; // For direct receipt data
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [GENERATE-RECEIPT] ${step}${detailsStr}`);
};

// Helper function to properly encode UTF-8 strings to base64
const encodeToBase64 = (str: string): string => {
  try {
    // Use TextEncoder to handle UTF-8 properly
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // Convert to base64 using btoa with binary string
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

    let invoice = null;
    let order = null;

    if (receiptData) {
      // Use provided receipt data directly
      logStep('Using provided receipt data', { requestId });
      order = receiptData;
    } else if (invoiceId) {
      // Get invoice and order details
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
            delivery_fee
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
      
      logStep('Invoice data retrieved', { 
        invoiceNumber: invoice.invoice_number,
        orderNumber: order.order_number,
        requestId 
      });
    } else if (orderId) {
      // Get order details only
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
          created_at
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        logStep('Order fetch error', { error: orderError, requestId });
        throw new Error('Order not found')
      }

      order = orderData;
      
      // Check if invoice exists for this order
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

    // Generate comprehensive HTML receipt
    const receiptHtml = generateReceiptHTML({
      invoice,
      order,
      sessionId,
      requestId
    })

    logStep('HTML receipt generated', { 
      size: receiptHtml.length,
      requestId 
    });

    // Create a blob URL instead of data URL for better compatibility
    try {
      const base64Html = encodeToBase64(receiptHtml);
      const downloadUrl = `data:text/html;charset=utf-8;base64,${base64Html}`;
      
      logStep('Base64 encoding successful', { 
        originalSize: receiptHtml.length,
        encodedSize: base64Html.length,
        requestId 
      });

      // Create response with receipt data
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
      
      // Fallback: return HTML content directly for manual save
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
  const { invoice, order, sessionId, requestId } = data
  const orderItems = order.products || []
  const isOrderReceipt = !invoice
  const isPaidOrder = order.payment_status === 'paid' || invoice?.status === 'paid'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 20px; 
      color: #333; 
      line-height: 1.6;
      background: #f8f9fa;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header { 
      text-align: center; 
      border-bottom: 3px solid #4ade80; 
      padding-bottom: 30px; 
      margin-bottom: 40px; 
    }
    .company-name { 
      font-size: 32px; 
      font-weight: bold; 
      color: #1e293b; 
      margin-bottom: 10px; 
    }
    .receipt-title { 
      font-size: 28px; 
      font-weight: bold; 
      color: #4ade80; 
      margin: 20px 0; 
    }
    .payment-confirmed { 
      background: linear-gradient(135deg, #4ade80, #22c55e); 
      color: white; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center; 
      font-weight: bold; 
      margin: 30px 0;
      font-size: 18px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .detail-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #4ade80;
    }
    .detail-section h3 {
      color: #1e293b;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .detail-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 12px 0; 
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .label { 
      font-weight: 600; 
      color: #64748b; 
    }
    .value { 
      color: #1e293b; 
      font-weight: 500;
    }
    .items { 
      margin: 40px 0; 
    }
    .items-header { 
      background: #1e293b;
      color: white;
      padding: 15px;
      border-radius: 8px 8px 0 0;
      font-weight: bold; 
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 20px;
    }
    .item { 
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 20px;
      padding: 15px; 
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
    }
    .item:last-child {
      border-radius: 0 0 8px 8px;
    }
    .item:nth-child(even) {
      background: #f8fafc;
    }
    .total-section { 
      background: #1e293b;
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin-top: 30px; 
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 20px;
      font-weight: bold;
    }
    .footer { 
      margin-top: 50px; 
      text-align: center; 
      color: #64748b; 
      border-top: 2px solid #e2e8f0;
      padding-top: 30px;
    }
    .footer p {
      margin: 10px 0;
    }
    .company-footer {
      color: #1e293b;
      font-weight: bold;
      font-size: 18px;
      margin-top: 20px;
    }
    @media print {
      body { background: white; margin: 0; }
      .receipt-container { box-shadow: none; margin: 0; }
    }
    @media (max-width: 768px) {
      .details-grid { grid-template-columns: 1fr; }
      .items-header, .item { grid-template-columns: 1fr; text-align: center; }
      .receipt-container { padding: 20px; margin: 10px; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="company-name">SwiftDispatch Pro</div>
      <div class="receipt-title">${isOrderReceipt ? (isPaidOrder ? 'PAYMENT RECEIPT' : 'ORDER RECEIPT') : 'INVOICE RECEIPT'}</div>
    </div>
    
    ${isPaidOrder ? `
    <div class="payment-confirmed">
      ✓ ${isOrderReceipt ? 'PAYMENT CONFIRMED' : 'INVOICE PAID'} - Thank you for your payment!
    </div>
    ` : `
    <div class="payment-pending" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; text-align: center; font-weight: bold; margin: 30px 0; font-size: 18px;">
      ⏳ PAYMENT ${order.payment_status?.toUpperCase() || 'PENDING'} - ${isOrderReceipt ? 'Order confirmed, payment processing' : 'Please complete payment'}
    </div>
    `}
    
    <div class="details-grid">
      <div class="detail-section">
        <h3>Receipt Information</h3>
        <div class="detail-row">
          <span class="label">${invoice ? 'Invoice Number:' : 'Receipt Number:'}</span>
          <span class="value">${invoice?.invoice_number || order.order_number}</span>
        </div>
        <div class="detail-row">
          <span class="label">Order Number:</span>
          <span class="value">${order.order_number}</span>
        </div>
        <div class="detail-row">
          <span class="label">${isOrderReceipt ? 'Order Date:' : 'Payment Date:'}</span>
          <span class="value">${isPaidOrder ? (invoice?.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : new Date().toLocaleDateString()) : new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        ${sessionId ? `
        <div class="detail-row">
          <span class="label">Transaction ID:</span>
          <span class="value">${sessionId}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="detail-section">
        <h3>Customer Information</h3>
        <div class="detail-row">
          <span class="label">Customer:</span>
          <span class="value">${order.customer_name}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Status:</span>
          <span class="value">${isPaidOrder ? 'PAID' : (order.payment_status?.toUpperCase() || 'PENDING')}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Method:</span>
          <span class="value">${order.payment_method || 'Not specified'}</span>
        </div>
        ${order.delivery_date ? `
        <div class="detail-row">
          <span class="label">Delivery Date:</span>
          <span class="value">${new Date(order.delivery_date).toLocaleDateString()}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${orderItems.length > 0 ? `
      <div class="items">
        <div class="items-header">
          <span>Item Description</span>
          <span>Quantity</span>
          <span>Price</span>
        </div>
        ${orderItems.map((item: any) => `
          <div class="item">
            <span>${item.name || 'Product'}</span>
            <span>${item.quantity || 1}</span>
            <span>$${(item.price || 0).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    <div class="total-section">
      <div class="total-row">
        <span>${isPaidOrder ? 'Total Amount Paid:' : 'Total Amount:'}</span>
        <span>$${(invoice?.amount || order.total_amount || 0).toFixed(2)}</span>
      </div>
      ${order.subtotal && order.delivery_fee ? `
        <div style="font-size: 14px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Subtotal:</span>
            <span>$${order.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>Delivery Fee:</span>
            <span>$${order.delivery_fee.toFixed(2)}</span>
          </div>
        </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p><strong>Thank you for your business!</strong></p>
      <p>This receipt was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      <p>For questions about this payment, please contact our support team.</p>
      <div class="company-footer">SwiftDispatch Pro</div>
      <p style="font-size: 12px; margin-top: 20px;">Receipt ID: ${requestId}</p>
    </div>
  </div>
</body>
</html>`
}

serve(handler)
