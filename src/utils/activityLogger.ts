
import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  actionType: string;
  targetType: string;
  targetId?: string;
  targetDetails?: any;
  oldValues?: any;
  newValues?: any;
  description: string;
}

export const logActivity = async ({
  actionType,
  targetType,
  targetId,
  targetDetails,
  oldValues,
  newValues,
  description
}: LogActivityParams) => {
  try {
    console.log('Logging activity:', { actionType, targetType, description });
    
    const { data, error } = await supabase.rpc('log_admin_activity', {
      p_action_type: actionType,
      p_target_type: targetType,
      p_target_id: targetId || null,
      p_target_details: targetDetails || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null,
      p_description: description
    });

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }

    console.log('Activity logged successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Helper functions for common activities
export const activityLogger = {
  orderStatusUpdate: (orderId: string, orderNumber: string, customerName: string, oldStatus: string, newStatus: string, adminName: string) =>
    logActivity({
      actionType: 'status_update',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { order_number: orderNumber, customer_name: customerName },
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      description: `${adminName} updated order ${orderNumber} status from ${oldStatus} to ${newStatus}`
    }),

  orderCancel: (orderId: string, orderNumber: string, customerName: string, adminName: string) =>
    logActivity({
      actionType: 'order_cancel',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { order_number: orderNumber, customer_name: customerName },
      description: `${adminName} cancelled order ${orderNumber} for ${customerName}`
    }),

  orderCreate: (orderId: string, orderNumber: string, customerName: string, totalAmount: number, adminName: string) =>
    logActivity({
      actionType: 'order_create',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { order_number: orderNumber, customer_name: customerName, total_amount: totalAmount },
      description: `${adminName} created order ${orderNumber} for ${customerName} ($${totalAmount})`
    }),

  orderEdit: (orderId: string, orderNumber: string, customerName: string, changes: any, adminName: string) =>
    logActivity({
      actionType: 'order_edit',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { order_number: orderNumber, customer_name: customerName },
      oldValues: changes.oldValues,
      newValues: changes.newValues,
      description: `${adminName} edited order ${orderNumber} for ${customerName}`
    }),

  invoiceSend: (invoiceId: string, orderNumber: string, customerEmail: string, amount: number, adminName: string) =>
    logActivity({
      actionType: 'invoice_send',
      targetType: 'invoice',
      targetId: invoiceId,
      targetDetails: { order_number: orderNumber, customer_email: customerEmail, amount },
      description: `${adminName} sent invoice for order ${orderNumber} to ${customerEmail} ($${amount})`
    }),

  paymentUpdate: (orderId: string, orderNumber: string, oldStatus: string, newStatus: string, adminName: string) =>
    logActivity({
      actionType: 'payment_update',
      targetType: 'payment',
      targetId: orderId,
      targetDetails: { order_number: orderNumber },
      oldValues: { payment_status: oldStatus },
      newValues: { payment_status: newStatus },
      description: `${adminName} updated payment status for order ${orderNumber} from ${oldStatus} to ${newStatus}`
    }),

  customerCreate: (customerId: string, customerName: string, customerEmail: string, adminName: string) =>
    logActivity({
      actionType: 'customer_create',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { customer_name: customerName, customer_email: customerEmail },
      description: `${adminName} created customer ${customerName} (${customerEmail})`
    }),

  customerEdit: (customerId: string, customerName: string, changes: any, adminName: string) =>
    logActivity({
      actionType: 'customer_edit',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { customer_name: customerName },
      oldValues: changes.oldValues,
      newValues: changes.newValues,
      description: `${adminName} edited customer ${customerName}`
    })
};
