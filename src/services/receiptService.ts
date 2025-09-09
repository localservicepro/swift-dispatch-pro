import { supabase } from "@/integrations/supabase/client";

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderDate: string;
  paymentDate?: string;
  paymentStatus: string;
  paymentMethod?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress?: string;
  specialInstructions?: string;
  invoiceNumber?: string;
  receiptType: 'order' | 'payment' | 'invoice';
}

export class ReceiptService {
  static async generateReceiptFromOrder(orderId: string): Promise<{ receiptUrl: string; receiptData: ReceiptData }> {
    // First, try to get invoice data if it exists
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    // Get order data
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          email,
          company_name,
          business_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      throw new Error('Failed to fetch order data');
    }

    // Prepare receipt data
    const receiptData: ReceiptData = {
      orderNumber: orderData.order_number,
      customerName: this.getCustomerDisplayName(orderData),
      customerEmail: orderData.customers?.email || '',
      customerPhone: orderData.customer_phone || '',
      orderDate: new Date(orderData.created_at).toLocaleDateString(),
      paymentDate: orderData.payment_date ? new Date(orderData.payment_date).toLocaleDateString() : undefined,
      paymentStatus: orderData.payment_status || 'pending',
      paymentMethod: orderData.payment_method || '',
      items: this.parseOrderItems(orderData.products),
      subtotal: orderData.subtotal || 0,
      deliveryFee: orderData.delivery_fee || 0,
      totalAmount: orderData.total_amount || 0,
      deliveryAddress: orderData.delivery_address || orderData.customer_address,
      specialInstructions: orderData.special_instructions || '',
      invoiceNumber: invoiceData?.invoice_number || '',
      receiptType: invoiceData ? 'invoice' : (orderData.payment_status === 'paid' ? 'payment' : 'order')
    };

    // Generate receipt using edge function
    const { data: receiptResponse, error: receiptError } = await supabase.functions.invoke('generate-receipt', {
      body: {
        orderId,
        invoiceId: invoiceData?.id || null,
        receiptData
      }
    });

    if (receiptError || !receiptResponse) {
      throw new Error('Failed to generate receipt');
    }

    return {
      receiptUrl: receiptResponse.downloadUrl,
      receiptData
    };
  }

  static async generateReceiptFromInvoice(invoiceId: string): Promise<{ receiptUrl: string; receiptData: ReceiptData }> {
    // Get invoice and order data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        orders (
          *,
          customers (
            email,
            company_name,
            business_name
          )
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoiceData || !invoiceData.orders) {
      throw new Error('Failed to fetch invoice data');
    }

    const orderData = invoiceData.orders;

    // Prepare receipt data
    const receiptData: ReceiptData = {
      orderNumber: orderData.order_number,
      customerName: this.getCustomerDisplayName(orderData),
      customerEmail: orderData.customers?.email || invoiceData.customer_email || '',
      customerPhone: orderData.customer_phone || '',
      orderDate: new Date(orderData.created_at).toLocaleDateString(),
      paymentDate: orderData.payment_date ? new Date(orderData.payment_date).toLocaleDateString() : undefined,
      paymentStatus: orderData.payment_status || invoiceData.status,
      paymentMethod: orderData.payment_method || '',
      items: this.parseOrderItems(orderData.products),
      subtotal: orderData.subtotal || 0,
      deliveryFee: orderData.delivery_fee || 0,
      totalAmount: invoiceData.amount || orderData.total_amount || 0,
      deliveryAddress: orderData.delivery_address || orderData.customer_address,
      specialInstructions: orderData.special_instructions || '',
      invoiceNumber: invoiceData.invoice_number,
      receiptType: 'invoice'
    };

    // Generate receipt using edge function
    const { data: receiptResponse, error: receiptError } = await supabase.functions.invoke('generate-receipt', {
      body: {
        orderId: orderData.id,
        invoiceId,
        receiptData
      }
    });

    if (receiptError || !receiptResponse) {
      throw new Error('Failed to generate receipt');
    }

    return {
      receiptUrl: receiptResponse.downloadUrl,
      receiptData
    };
  }

  private static getCustomerDisplayName(orderData: any): string {
    // Prioritize company name for account customers
    if (orderData.customers?.company_name) {
      return orderData.customers.company_name;
    }
    
    // Fall back to business name for business customers
    if (orderData.customers?.business_name) {
      return orderData.customers.business_name;
    }
    
    // Use customer name as final fallback
    return orderData.customer_name || 'Unknown Customer';
  }

  private static parseOrderItems(products: any): Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> {
    if (!products) return [];

    if (Array.isArray(products)) {
      return products.map(item => ({
        name: item.name || item.product_name || 'Product',
        quantity: item.quantity || 1,
        unitPrice: item.price || item.unit_price || 0,
        totalPrice: (item.price || item.unit_price || 0) * (item.quantity || 1)
      }));
    }

    if (typeof products === 'object') {
      return [{
        name: products.name || products.product_name || 'Product',
        quantity: products.quantity || 1,
        unitPrice: products.price || products.unit_price || 0,
        totalPrice: (products.price || products.unit_price || 0) * (products.quantity || 1)
      }];
    }

    return [];
  }

  static async downloadReceipt(receiptUrl: string, orderNumber: string): Promise<void> {
    try {
      const response = await fetch(receiptUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `receipt-${orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      throw new Error('Failed to download receipt');
    }
  }

  static async printReceipt(receiptUrl: string): Promise<void> {
    try {
      const printWindow = window.open(receiptUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        throw new Error('Popup blocked');
      }
    } catch (error) {
      throw new Error('Failed to print receipt');
    }
  }

  static async emailReceipt(orderId: string, customerEmail: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'receipt',
          data: {
            orderId,
            customerEmail
          }
        }
      });

      if (error) {
        throw new Error('Failed to send receipt email');
      }
    } catch (error) {
      throw new Error('Failed to email receipt');
    }
  }
}