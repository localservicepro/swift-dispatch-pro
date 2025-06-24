
import { supabase } from "@/integrations/supabase/client";

export interface SplitOrderGroup {
  masterOrder: any;
  splitOrders: any[];
  allOrders: any[];
  totalAmount: number;
  canInvoice: boolean;
  hasExistingInvoice: boolean;
}

export async function detectSplitOrderGroups(orders: any[]): Promise<SplitOrderGroup[]> {
  const groups: SplitOrderGroup[] = [];
  const processedMasterIds = new Set<string>();

  for (const order of orders) {
    // Skip if this is a split order (has master_order_id) or already processed
    if (order.master_order_id || processedMasterIds.has(order.id)) {
      continue;
    }

    // Check if this order has related split orders
    const splitOrders = orders.filter(o => o.master_order_id === order.id);
    
    if (splitOrders.length > 0) {
      // This is a master order with splits
      const allOrders = [order, ...splitOrders];
      const totalAmount = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
      
      // Check if any order in the group already has a batch invoice
      const hasExistingInvoice = allOrders.some(o => o.batch_invoice_id);
      
      // Can invoice if all orders are in 'pending' payment status and no existing batch invoice
      const canInvoice = allOrders.every(o => o.payment_status === 'pending') && !hasExistingInvoice;

      groups.push({
        masterOrder: order,
        splitOrders,
        allOrders,
        totalAmount,
        canInvoice,
        hasExistingInvoice
      });

      processedMasterIds.add(order.id);
    }
  }

  return groups;
}

// Utility function to wait for database transaction completion
async function waitForTransactionCommit(delay: number = 1500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Retry mechanism for database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function createBatchInvoiceForSplitOrder(splitOrderGroup: SplitOrderGroup) {
  console.log('Creating batch invoice for split order group:', splitOrderGroup);

  try {
    const { masterOrder, allOrders } = splitOrderGroup;
    const invoiceNumber = `BATCH-${masterOrder.order_number}-${Date.now()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create batch invoice record with proper currency format
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: masterOrder.id, // Link to master order
        customer_email: masterOrder.customers?.email || `${masterOrder.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
        amount: splitOrderGroup.totalAmount,
        currency: 'USD', // Standardized currency format
        status: 'pending',
        due_date: dueDate,
        is_batch_invoice: true,
        batch_invoice_type: 'split_batch',
        related_order_ids: allOrders.map(o => o.id)
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Batch invoice creation error:', invoiceError);
      throw new Error(`Failed to create batch invoice: ${invoiceError.message}`);
    }

    console.log('Batch invoice created:', invoice.id);

    // Wait for transaction commit to ensure invoice is fully available
    await waitForTransactionCommit();

    // Verify invoice exists before proceeding
    const { data: verifyInvoice, error: verifyError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('id', invoice.id)
      .single();

    if (verifyError || !verifyInvoice) {
      console.error('Invoice verification failed:', verifyError);
      throw new Error('Invoice creation failed - invoice not found after creation');
    }

    console.log('Invoice verified successfully:', verifyInvoice);

    // Create payment session with retry mechanism
    const paymentResult = await retryOperation(async () => {
      console.log('Attempting to create payment session for invoice:', invoice.id);
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-invoice-payment', {
        body: { invoiceId: invoice.id }
      });

      if (paymentError) {
        console.error('Payment session error:', paymentError);
        throw new Error(`Payment session error: ${paymentError.message}`);
      }

      if (!paymentData?.success) {
        console.error('Payment session failed:', paymentData);
        throw new Error(paymentData?.error || 'Failed to create payment session');
      }

      return paymentData;
    });

    console.log('Payment session created successfully:', paymentResult);

    // Update all orders with the batch invoice reference and status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        batch_invoice_id: invoice.id,
        payment_status: 'invoiced'
      })
      .in('id', allOrders.map(o => o.id));

    if (updateError) {
      console.error('Error updating orders with batch invoice:', updateError);
      throw new Error(`Failed to link orders to batch invoice: ${updateError.message}`);
    }

    return {
      invoice,
      paymentUrl: paymentResult.paymentUrl,
      sessionId: paymentResult.sessionId
    };

  } catch (error: any) {
    console.error('Error creating batch invoice:', error);
    throw new Error(error.message || 'Failed to create batch invoice');
  }
}
