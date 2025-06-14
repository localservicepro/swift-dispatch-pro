
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
  paymentUrl?: string;
}

export const emailService = {
  async sendOrderConfirmation(data: OrderConfirmationData) {
    console.log('Sending order confirmation email:', data);
    
    // Validate required fields before sending
    if (!data.customerName || !data.customerEmail || !data.orderNumber) {
      throw new Error('Missing required fields for order confirmation email');
    }
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'order-confirmation',
        data
      }
    });
    
    if (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  },

  async sendDeliveryStatusUpdate(data: DeliveryStatusUpdateData) {
    console.log('Sending delivery status update email:', data);
    
    // Validate required fields before sending
    if (!data.customerName || !data.customerEmail || !data.orderNumber || !data.newStatus) {
      throw new Error('Missing required fields for delivery status update email');
    }
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'delivery-status-update',
        data
      }
    });
    
    if (error) {
      console.error('Error sending delivery status update:', error);
      throw error;
    }
  },

  async sendInvoice(data: InvoiceData) {
    console.log('Sending invoice email:', data);
    
    // Validate required fields before sending
    if (!data.customerName || !data.customerEmail || !data.orderNumber || !data.invoiceNumber) {
      throw new Error('Missing required fields for invoice email');
    }
    
    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'invoice',
        data
      }
    });
    
    if (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }
};
