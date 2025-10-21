import { supabase } from "@/integrations/supabase/client";

interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryAddress: string;
  deliveryDate?: string;
  deliveryTime?: string;
  specialInstructions?: string;
}

interface DeliveryStatusUpdateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  driverName?: string;
  notes?: string;
  estimatedDeliveryTime?: string;
}

interface InvoiceData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  invoiceNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  dueDate: string;
  paymentStatus: string;
}

interface PaymentConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  invoiceNumber: string;
  paymentAmount: number;
  currency?: string;
  paymentMethod: string;
  transactionId: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  receiptDownloadUrl?: string;
  paymentDate: string;
}

interface PickupReadyData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  pickupAddress: string;
  businessName?: string;
  businessHours?: string;
  specialInstructions?: string;
  contactPhone?: string;
}

export const emailService = {
  async getCustomerEmail(orderId: string): Promise<string | null> {
    try {
      // First try to get email from customer_id if it exists
      const { data: order } = await supabase
        .from('orders')
        .select(`
          customer_id,
          customers!orders_customer_id_fkey(email)
        `)
        .eq('id', orderId)
        .single();

      if (order?.customers?.email) {
        return order.customers.email;
      }

      // Fallback: For now return a placeholder email
      // In production, you would want to handle this differently
      console.warn('No customer email found for order:', orderId);
      return null;
    } catch (error) {
      console.error('Error getting customer email:', error);
      return null;
    }
  },

  async sendPaymentConfirmation(data: PaymentConfirmationData) {
    console.log('Sending payment confirmation email:', data);
    
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'payment-confirmation',
          data
        }
      });
      
      if (error) {
        console.error('Error sending payment confirmation:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      console.log('Payment confirmation email sent successfully');
    } catch (error: any) {
      console.error('Failed to send payment confirmation email:', error);
      throw new Error(`Failed to send payment confirmation: ${error.message}`);
    }
  },

  async sendOrderConfirmation(data: OrderConfirmationData) {
    console.log('Sending order confirmation email:', data);
    
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'order-confirmation',
          data
        }
      });
      
      if (error) {
        console.error('Error sending order confirmation:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      console.log('Order confirmation email sent successfully');
    } catch (error: any) {
      console.error('Failed to send order confirmation email:', error);
      throw new Error(`Failed to send order confirmation: ${error.message}`);
    }
  },

  async sendDeliveryStatusUpdate(data: DeliveryStatusUpdateData) {
    console.log('Sending delivery status update email:', data);
    
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'delivery-status-update',
          data
        }
      });
      
      if (error) {
        console.error('Error sending delivery status update:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      console.log('Delivery status update email sent successfully');
    } catch (error: any) {
      console.error('Failed to send delivery status update email:', error);
      throw new Error(`Failed to send status update: ${error.message}`);
    }
  },

  async sendOrderStatusUpdate(orderId: string, oldStatus: string, newStatus: string, driverName?: string) {
    try {
      console.log(`Sending order status update email for order: ${orderId}`);
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          order_number,
          customer_name,
          customer_id,
          customers!orders_customer_id_fkey(email)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order for status update email:', orderError);
        throw new Error(`Failed to fetch order: ${orderError.message}`);
      }

      const customerEmail = order?.customers?.email;
      if (!customerEmail) {
        console.warn('No customer email found for order status update:', orderId);
        return; // Don't throw error, just skip email
      }

      await this.sendDeliveryStatusUpdate({
        customerName: order.customer_name,
        customerEmail,
        orderNumber: order.order_number,
        oldStatus,
        newStatus,
        driverName
      });

      console.log('Order status update email sent successfully');
    } catch (error: any) {
      console.error('Error sending order status update email:', error);
      // Don't throw error to avoid blocking the status update
      // Just log the error for monitoring
    }
  },

  async sendInvoice(data: InvoiceData) {
    console.log('Sending invoice email:', data);
    
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data
        }
      });
      
      if (error) {
        console.error('Error sending invoice:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      console.log('Invoice email sent successfully');
    } catch (error: any) {
      console.error('Failed to send invoice email:', error);
      throw new Error(`Failed to send invoice: ${error.message}`);
    }
  },

  async sendPickupReadyNotification(data: PickupReadyData) {
    console.log('Sending pickup ready notification email:', data);
    
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          emailType: 'pickup-ready',
          emailData: data
        }
      });
      
      if (error) {
        console.error('Error sending pickup ready notification:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      console.log('Pickup ready notification email sent successfully');
    } catch (error: any) {
      console.error('Failed to send pickup ready notification email:', error);
      throw new Error(`Failed to send pickup notification: ${error.message}`);
    }
  }
};
