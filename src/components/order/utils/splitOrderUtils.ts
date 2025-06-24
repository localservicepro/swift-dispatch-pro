
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

export async function createBatchInvoiceForSplitOrder(splitOrderGroup: SplitOrderGroup) {
  console.log('Creating batch invoice for split order group:', splitOrderGroup);

  try {
    const { masterOrder, allOrders } = splitOrderGroup;
    const invoiceNumber = `BATCH-${masterOrder.order_number}-${Date.now()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create batch invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: masterOrder.id, // Link to master order
        customer_email: masterOrder.customers?.email || `${masterOrder.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
        amount: splitOrderGroup.totalAmount,
        currency: 'USD',
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

    // Create payment session for the combined amount
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
      paymentUrl: paymentData.paymentUrl,
      sessionId: paymentData.sessionId
    };

  } catch (error: any) {
    console.error('Error creating batch invoice:', error);
    throw new Error(error.message || 'Failed to create batch invoice');
  }
}
