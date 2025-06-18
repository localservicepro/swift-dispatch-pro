
import { supabase } from "@/integrations/supabase/client";

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  payment_status: string;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
}

export const generateAndSendInvoice = async (
  orderId: string,
  payments: PaymentOrder[],
  toast: any,
  queryClient: any,
  setGeneratingInvoices: (fn: (prev: string[]) => string[]) => void
) => {
  setGeneratingInvoices(prev => [...prev, orderId]);

  try {
    const order = payments.find(p => p.id === orderId);
    if (!order) throw new Error('Order not found');

    console.log('Starting invoice generation for order:', order.order_number);

    // Generate unique invoice number
    const invoiceNumber = `INV-${order.order_number}-${Date.now()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create invoice record first
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        customer_email: order.customer_email,
        amount: order.total_amount,
        currency: 'USD',
        status: 'pending',
        due_date: dueDate
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError);
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    console.log('Invoice created:', invoice.id);

    // Create payment session
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-invoice-payment', {
      body: { invoiceId: invoice.id }
    });

    if (paymentError) {
      console.error('Payment session error:', paymentError);
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Failed to create payment session: ${paymentError.message}`);
    }

    if (!paymentData.success) {
      console.error('Payment session failed:', paymentData);
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(paymentData.error || 'Failed to create payment session');
    }

    console.log('Payment session created:', paymentData.sessionId);

    // Parse products for email
    let orderItems = [];
    if (Array.isArray(order.products)) {
      orderItems = order.products.map(item => ({
        name: item.name || item.product_name || 'Product',
        quantity: item.quantity || 1,
        price: item.price || item.unit_price || 0
      }));
    } else if (order.products && typeof order.products === 'object') {
      orderItems = [{
        name: order.products.name || 'Product',
        quantity: order.products.quantity || 1,
        price: order.products.price || order.total_amount
      }];
    } else {
      orderItems = [{
        name: 'Order Items',
        quantity: 1,
        price: order.subtotal || order.total_amount - (order.delivery_fee || 0)
      }];
    }

    // Send invoice email with payment link
    const { error: emailError } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'invoice',
        data: {
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderNumber: order.order_number,
          invoiceNumber: invoiceNumber,
          orderItems: orderItems,
          subtotal: order.subtotal || order.total_amount - (order.delivery_fee || 0),
          deliveryFee: order.delivery_fee || 0,
          totalAmount: order.total_amount,
          dueDate: new Date(dueDate).toLocaleDateString(),
          paymentStatus: 'Pending',
          paymentUrl: paymentData.paymentUrl
        }
      }
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceNumber} was created but email failed to send. Payment link is available in the system.`,
        variant: "destructive"
      });
    } else {
      await updatePaymentStatus(orderId, 'invoiced', toast);
      
      toast({
        title: "Invoice Generated & Sent",
        description: `Invoice ${invoiceNumber} sent to ${order.customer_name} with payment link`
      });
    }

    queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
    
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to generate and send invoice. Please try again.",
      variant: "destructive"
    });
  } finally {
    setGeneratingInvoices(prev => prev.filter(id => id !== orderId));
  }
};

export const sendInvoice = async (
  orderId: string,
  payments: PaymentOrder[],
  toast: any,
  setSendingInvoices: (fn: (prev: string[]) => string[]) => void
) => {
  setSendingInvoices(prev => [...prev, orderId]);
  try {
    const order = payments.find(p => p.id === orderId);
    if (!order) throw new Error('Order not found');

    // Parse products from the order
    let orderItems = [];
    if (Array.isArray(order.products)) {
      orderItems = order.products.map(item => ({
        name: item.name || item.product_name || 'Product',
        quantity: item.quantity || 1,
        price: item.price || item.unit_price || 0
      }));
    } else if (order.products && typeof order.products === 'object') {
      orderItems = [{
        name: order.products.name || 'Product',
        quantity: order.products.quantity || 1,
        price: order.products.price || order.total_amount
      }];
    } else {
      orderItems = [{
        name: 'Order Items',
        quantity: 1,
        price: order.subtotal || order.total_amount - (order.delivery_fee || 0)
      }];
    }

    const { error } = await supabase.functions.invoke('send-emails', {
      body: {
        type: 'invoice',
        data: {
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderNumber: order.order_number,
          invoiceNumber: `INV-${order.order_number}`,
          orderItems: orderItems,
          subtotal: order.subtotal || order.total_amount - (order.delivery_fee || 0),
          deliveryFee: order.delivery_fee || 0,
          totalAmount: order.total_amount,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          paymentStatus: order.payment_status
        }
      }
    });

    if (error) throw error;
    
    await updatePaymentStatus(orderId, 'invoiced', toast);
    
    toast({
      title: "Invoice Sent",
      description: `Invoice for ${order.order_number} has been sent to ${order.customer_name}`
    });
  } catch (error: any) {
    console.error('Error sending invoice:', error);
    toast({
      title: "Error",
      description: "Failed to send invoice. Please try again.",
      variant: "destructive"
    });
  } finally {
    setSendingInvoices(prev => prev.filter(id => id !== orderId));
  }
};

export const updatePaymentStatus = async (orderId: string, newStatus: string, toast: any) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: newStatus,
        payment_date: newStatus === 'paid' ? new Date().toISOString() : null
      })
      .eq('id', orderId);

    if (error) throw error;
    
    toast({
      title: "Payment Status Updated",
      description: `Payment status changed to ${newStatus}`
    });
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    toast({
      title: "Error",
      description: "Failed to update payment status",
      variant: "destructive"
    });
  }
};
