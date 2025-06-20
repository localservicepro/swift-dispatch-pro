
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateReceiptRequest {
  invoiceId: string
  sessionId: string
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Generating receipt...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { invoiceId, sessionId }: GenerateReceiptRequest = await req.json()

    // Get invoice and order details
    const { data: invoice, error: invoiceError } = await supabase
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
          delivery_time
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    // Generate simple HTML receipt
    const receiptHtml = generateReceiptHTML({
      invoice,
      order: invoice.orders,
      sessionId
    })

    // Convert HTML to base64 data URL for simple PDF generation
    // In a production environment, you'd use a proper PDF library
    const receiptData = {
      html: receiptHtml,
      invoiceNumber: invoice.invoice_number,
      orderNumber: invoice.orders.order_number,
      generatedAt: new Date().toISOString()
    }

    console.log('Receipt generated successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        receiptData,
        downloadUrl: `data:text/html;base64,${btoa(receiptHtml)}`
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
    console.error('Error generating receipt:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate receipt'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
}

function generateReceiptHTML(data: any): string {
  const { invoice, order, sessionId } = data
  const orderItems = order.products || []
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #4ade80; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
        .receipt-title { font-size: 32px; font-weight: bold; color: #4ade80; margin: 20px 0; }
        .details { margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; color: #64748b; }
        .value { color: #1e293b; }
        .items { margin: 30px 0; }
        .items-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-weight: bold; }
        .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .total { border-top: 2px solid #e2e8f0; margin-top: 20px; padding-top: 15px; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; }
        .payment-confirmed { background: #dcfce7; color: #166534; padding: 15px; border-radius: 6px; text-align: center; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">SwiftDispatch Pro</div>
        <div class="receipt-title">PAYMENT RECEIPT</div>
      </div>
      
      <div class="payment-confirmed">
        ✓ PAYMENT CONFIRMED - Thank you for your payment!
      </div>
      
      <div class="details">
        <div class="detail-row">
          <span class="label">Receipt Number:</span>
          <span class="value">${invoice.invoice_number}</span>
        </div>
        <div class="detail-row">
          <span class="label">Order Number:</span>
          <span class="value">${order.order_number}</span>
        </div>
        <div class="detail-row">
          <span class="label">Customer:</span>
          <span class="value">${order.customer_name}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Date:</span>
          <span class="value">${invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Transaction ID:</span>
          <span class="value">${sessionId}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Status:</span>
          <span class="value">PAID</span>
        </div>
      </div>
      
      ${orderItems.length > 0 ? `
        <div class="items">
          <div class="items-header">
            <div style="display: flex; justify-content: space-between;">
              <span>Item Description</span>
              <span>Quantity</span>
              <span>Price</span>
            </div>
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
      
      <div class="total">
        <div class="detail-row">
          <span>Total Amount Paid:</span>
          <span>$${invoice.amount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This receipt was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>For questions about this payment, please contact our support team.</p>
      </div>
    </body>
    </html>
  `
}

serve(handler)
