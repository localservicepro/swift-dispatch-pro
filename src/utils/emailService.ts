
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
    console.log('Input data:', JSON.stringify(data, null, 2));
    
    // Enhanced validation with detailed logging
    const validationErrors: string[] = [];
    
    if (!data.customerName || data.customerName.trim() === '') {
      validationErrors.push('customerName is required and cannot be empty');
    }
    
    if (!data.customerEmail || data.customerEmail.trim() === '') {
      validationErrors.push('customerEmail is required and cannot be empty');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      validationErrors.push('customerEmail must be a valid email address');
    }
    
    if (!data.orderNumber || data.orderNumber.trim() === '') {
      validationErrors.push('orderNumber is required and cannot be empty');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:', validationErrors);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    console.log('✅ Client-side validation passed');
    
    try {
      console.log('Calling send-emails function...');
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'order-confirmation',
          data: {
            ...data,
            // Ensure all required fields are present with defaults
            orderItems: data.orderItems || [],
            totalAmount: data.totalAmount || 0,
            deliveryAddress: data.deliveryAddress || 'No address provided'
          }
        }
      });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }
      
      console.log('✅ Email function returned:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send order confirmation email: ${error.message}`);
    }
  },

  async sendDeliveryStatusUpdate(data: DeliveryStatusUpdateData) {
    console.log('=== EMAIL SERVICE: Delivery Status Update ===');
    console.log('Input data:', JSON.stringify(data, null, 2));
    
    // Enhanced validation
    const validationErrors: string[] = [];
    
    if (!data.customerName?.trim()) {
      validationErrors.push('customerName is required');
    }
    
    if (!data.customerEmail?.trim()) {
      validationErrors.push('customerEmail is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      validationErrors.push('customerEmail must be valid');
    }
    
    if (!data.orderNumber?.trim()) {
      validationErrors.push('orderNumber is required');
    }
    
    if (!data.newStatus?.trim()) {
      validationErrors.push('newStatus is required');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:', validationErrors);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    console.log('✅ Client-side validation passed');
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'delivery-status-update',
          data: {
            ...data,
            oldStatus: data.oldStatus || 'Unknown'
          }
        }
      });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }
      
      console.log('✅ Email function returned:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send delivery status update email: ${error.message}`);
    }
  },

  async sendInvoice(data: InvoiceData) {
    console.log('=== EMAIL SERVICE: Invoice ===');
    console.log('Input data:', JSON.stringify(data, null, 2));
    
    // Enhanced validation
    const validationErrors: string[] = [];
    
    if (!data.customerName?.trim()) {
      validationErrors.push('customerName is required');
    }
    
    if (!data.customerEmail?.trim()) {
      validationErrors.push('customerEmail is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail)) {
      validationErrors.push('customerEmail must be valid');
    }
    
    if (!data.orderNumber?.trim()) {
      validationErrors.push('orderNumber is required');
    }
    
    if (!data.invoiceNumber?.trim()) {
      validationErrors.push('invoiceNumber is required');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:', validationErrors);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    console.log('✅ Client-side validation passed');
    
    try {
      const { data: result, error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'invoice',
          data: {
            ...data,
            // Ensure required numeric fields have defaults
            orderItems: data.orderItems || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            totalAmount: data.totalAmount || 0,
            dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            paymentStatus: data.paymentStatus || 'Pending'
          }
        }
      });
      
      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }
      
      console.log('✅ Email function returned:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Email service error:', error);
      throw new Error(`Failed to send invoice email: ${error.message}`);
    }
  }
};
