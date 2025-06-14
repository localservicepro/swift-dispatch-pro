
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
    console.log('=== EMAIL SERVICE: Order Confirmation ===');
    console.log('Sending data:', data);
    
    // Validate required fields
    if (!data.customerName?.trim()) {
      throw new Error('Customer name is required');
    }
    if (!data.customerEmail?.trim()) {
      throw new Error('Customer email is required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      throw new Error('Valid customer email is required');
    }
    if (!data.orderNumber?.trim()) {
      throw new Error('Order number is required');
    }
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'order-confirmation',
          data: {
            customerName: data.customerName.trim(),
            customerEmail: data.customerEmail.trim(),
            orderNumber: data.orderNumber.trim(),
            orderItems: data.orderItems || [],
            totalAmount: data.totalAmount || 0,
            deliveryAddress: data.deliveryAddress || '',
            deliveryDate: data.deliveryDate,
            deliveryTime: data.deliveryTime,
            specialInstructions: data.specialInstructions,
          }
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      if (!result?.success) {
        console.error('Email function returned error:', result);
        throw new Error(result?.error || 'Failed to send email');
      }
      
      console.log('✅ Order confirmation email sent successfully:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send order confirmation email: ${error.message}`);
    }
  },

  async sendDeliveryStatusUpdate(data: DeliveryStatusUpdateData) {
    console.log('=== EMAIL SERVICE: Delivery Status Update ===');
    console.log('Sending data:', data);
    
    // Validate required fields
    if (!data.customerName?.trim()) {
      throw new Error('Customer name is required');
    }
    if (!data.customerEmail?.trim()) {
      throw new Error('Customer email is required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      throw new Error('Valid customer email is required');
    }
    if (!data.orderNumber?.trim()) {
      throw new Error('Order number is required');
    }
    if (!data.newStatus?.trim()) {
      throw new Error('New status is required');
    }
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'delivery-status-update',
          data: {
            customerName: data.customerName.trim(),
            customerEmail: data.customerEmail.trim(),
            orderNumber: data.orderNumber.trim(),
            oldStatus: data.oldStatus || '',
            newStatus: data.newStatus.trim(),
            driverName: data.driverName,
            notes: data.notes,
            estimatedDeliveryTime: data.estimatedDeliveryTime,
          }
        }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      if (!result?.success) {
        console.error('Email function returned error:', result);
        throw new Error(result?.error || 'Failed to send email');
      }
      
      console.log('✅ Delivery status update email sent successfully:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send delivery status update email: ${error.message}`);
    }
  },

  async sendInvoice(data: InvoiceData) {
    console.log('=== EMAIL SERVICE: Invoice ===');
    console.log('Sending data:', data);
    
    // Validate required fields
    if (!data.customerName?.trim()) {
      throw new Error('Customer name is required');
    }
    if (!data.customerEmail?.trim()) {
      throw new Error('Customer email is required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      throw new Error('Valid customer email is required');
    }
    if (!data.orderNumber?.trim()) {
      throw new Error('Order number is required');
    }
    if (!data.invoiceNumber?.trim()) {
      throw new Error('Invoice number is required');
    }
    
    try {
      console.log('Calling Supabase edge function...');
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            customerName: data.customerName.trim(),
            customerEmail: data.customerEmail.trim(),
            orderNumber: data.orderNumber.trim(),
            invoiceNumber: data.invoiceNumber.trim(),
            orderItems: data.orderItems || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            totalAmount: data.totalAmount || 0,
            dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            paymentStatus: data.paymentStatus || 'Pending',
            paymentUrl: data.paymentUrl,
          }
        }
      });
      
      console.log('Supabase function response:', result);
      console.log('Supabase function error:', error);
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Email service error: ${error.message}`);
      }
      
      if (!result?.success) {
        console.error('Email function returned error:', result);
        throw new Error(result?.error || 'Failed to send email');
      }
      
      console.log('✅ Invoice email sent successfully:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send invoice email: ${error.message}`);
    }
  },

  // Add a test function to verify the edge function works
  async testEmailFunction() {
    console.log('=== TESTING EMAIL FUNCTION ===');
    
    const testData = {
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      orderNumber: 'TEST-ORDER-001',
      invoiceNumber: 'INV-TEST-001',
      orderItems: [{
        name: 'Test Product',
        quantity: 1,
        price: 10.00
      }],
      subtotal: 10.00,
      deliveryFee: 5.00,
      totalAmount: 15.00,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      paymentStatus: 'Pending'
    };

    try {
      const result = await this.sendInvoice(testData);
      console.log('✅ Test email successful:', result);
      return { success: true, result };
    } catch (error: any) {
      console.error('❌ Test email failed:', error);
      return { success: false, error: error.message };
    }
  }
};
