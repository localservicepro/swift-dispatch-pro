
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

export const emailService = {
  async getEmailSettings() {
    try {
      const { data: emailSettings } = await supabase
        .from('email_settings')
        .select('*')
        .single();
      
      return emailSettings;
    } catch (error) {
      console.error('Error fetching email settings:', error);
      return null;
    }
  },

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

  async sendOrderConfirmation(data: OrderConfirmationData) {
    console.log('Sending order confirmation email:', data);
    
    // Get email settings to include sender information
    const emailSettings = await this.getEmailSettings();
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'order-confirmation',
        data,
        emailSettings
      }
    });
    
    if (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  },

  async sendDeliveryStatusUpdate(data: DeliveryStatusUpdateData) {
    console.log('Sending delivery status update email:', data);
    
    // Get email settings to include sender information
    const emailSettings = await this.getEmailSettings();
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'delivery-status-update',
        data,
        emailSettings
      }
    });
    
    if (error) {
      console.error('Error sending delivery status update:', error);
      throw error;
    }
  },

  async sendOrderStatusUpdate(orderId: string, oldStatus: string, newStatus: string, driverName?: string) {
    try {
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
        return;
      }

      const customerEmail = order?.customers?.email;
      if (!customerEmail) {
        console.warn('No customer email found for order status update:', orderId);
        return;
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
    } catch (error) {
      console.error('Error sending order status update email:', error);
      // Don't throw error to avoid blocking the status update
    }
  },

  async sendInvoice(data: InvoiceData) {
    console.log('Sending invoice email:', data);
    
    // Get email settings to include sender information
    const emailSettings = await this.getEmailSettings();
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'invoice',
        data,
        emailSettings
      }
    });
    
    if (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }
};
