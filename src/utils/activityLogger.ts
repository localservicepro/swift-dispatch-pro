
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

// Sanitize data to ensure it's safe for JSON serialization
const sanitizeForJson = (data: any): any => {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (typeof data === 'string') {
    // Remove or escape problematic characters that can break JSON
    return data.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizeForJson(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
};

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
    
    // Sanitize all data before sending to database
    const sanitizedTargetDetails = sanitizeForJson(targetDetails);
    const sanitizedOldValues = sanitizeForJson(oldValues);
    const sanitizedNewValues = sanitizeForJson(newValues);
    const sanitizedDescription = sanitizeForJson(description);
    
    const { data, error } = await supabase.rpc('log_admin_activity', {
      p_action_type: actionType,
      p_target_type: targetType,
      p_target_id: targetId || null,
      p_target_details: sanitizedTargetDetails || null,
      p_old_values: sanitizedOldValues || null,
      p_new_values: sanitizedNewValues || null,
      p_description: sanitizedDescription
    });

    if (error) {
      console.error('Error logging activity:', error);
      // Don't throw error to avoid breaking main functionality
      return null;
    }

    console.log('Activity logged successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

// Helper functions for common activities with simplified data structures
export const activityLogger = {
  orderStatusUpdate: (orderId: string, orderNumber: string, customerName: string, oldStatus: string, newStatus: string, adminName: string) =>
    logActivity({
      actionType: 'status_update',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: sanitizeForJson(orderNumber), 
        customer_name: sanitizeForJson(customerName) 
      },
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      description: `${sanitizeForJson(adminName)} updated order ${sanitizeForJson(orderNumber)} status from ${oldStatus} to ${newStatus}`
    }),

  orderCancel: (orderId: string, orderNumber: string, customerName: string, adminName: string) =>
    logActivity({
      actionType: 'order_cancel',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: sanitizeForJson(orderNumber), 
        customer_name: sanitizeForJson(customerName) 
      },
      description: `${sanitizeForJson(adminName)} cancelled order ${sanitizeForJson(orderNumber)} for ${sanitizeForJson(customerName)}`
    }),

  orderCreate: (orderId: string, orderNumber: string, customerName: string, totalAmount: number, adminName: string) =>
    logActivity({
      actionType: 'order_create',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: sanitizeForJson(orderNumber), 
        customer_name: sanitizeForJson(customerName), 
        total_amount: totalAmount 
      },
      description: `${sanitizeForJson(adminName)} created order ${sanitizeForJson(orderNumber)} for ${sanitizeForJson(customerName)} ($${totalAmount})`
    }),

  orderEdit: (orderId: string, orderNumber: string, customerName: string, changes: any, adminName: string) =>
    logActivity({
      actionType: 'order_edit',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: sanitizeForJson(orderNumber), 
        customer_name: sanitizeForJson(customerName) 
      },
      oldValues: sanitizeForJson(changes.oldValues),
      newValues: sanitizeForJson(changes.newValues),
      description: `${sanitizeForJson(adminName)} edited order ${sanitizeForJson(orderNumber)} for ${sanitizeForJson(customerName)}`
    }),

  invoiceSend: (invoiceId: string, orderNumber: string, customerEmail: string, amount: number, adminName: string) =>
    logActivity({
      actionType: 'invoice_send',
      targetType: 'invoice',
      targetId: invoiceId,
      targetDetails: { 
        order_number: sanitizeForJson(orderNumber), 
        customer_email: sanitizeForJson(customerEmail), 
        amount 
      },
      description: `${sanitizeForJson(adminName)} sent invoice for order ${sanitizeForJson(orderNumber)} to ${sanitizeForJson(customerEmail)} ($${amount})`
    }),

  paymentUpdate: (orderId: string, orderNumber: string, oldStatus: string, newStatus: string, adminName: string) =>
    logActivity({
      actionType: 'payment_update',
      targetType: 'payment',
      targetId: orderId,
      targetDetails: { order_number: sanitizeForJson(orderNumber) },
      oldValues: { payment_status: oldStatus },
      newValues: { payment_status: newStatus },
      description: `${sanitizeForJson(adminName)} updated payment status for order ${sanitizeForJson(orderNumber)} from ${oldStatus} to ${newStatus}`
    }),

  customerCreate: (customerId: string, customerName: string, customerEmail: string, adminName: string) =>
    logActivity({
      actionType: 'customer_create',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { 
        customer_name: sanitizeForJson(customerName), 
        customer_email: sanitizeForJson(customerEmail) 
      },
      description: `${sanitizeForJson(adminName)} created customer ${sanitizeForJson(customerName)} (${sanitizeForJson(customerEmail)})`
    }),

  customerEdit: (customerId: string, customerName: string, changes: any, adminName: string) =>
    logActivity({
      actionType: 'customer_edit',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { customer_name: sanitizeForJson(customerName) },
      oldValues: sanitizeForJson(changes.oldValues),
      newValues: sanitizeForJson(changes.newValues),
      description: `${sanitizeForJson(adminName)} edited customer ${sanitizeForJson(customerName)}`
    })
};
