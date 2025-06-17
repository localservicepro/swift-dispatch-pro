
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

// Completely safe JSON sanitizer that removes all problematic data
const createSafeJsonData = (data: any): any => {
  if (!data) return null;
  
  try {
    // Convert to string first, then parse to ensure clean JSON
    const stringified = JSON.stringify(data, (key, value) => {
      // Remove any functions, undefined values, or circular references
      if (typeof value === 'function' || value === undefined) {
        return null;
      }
      // Convert all values to simple strings or numbers
      if (typeof value === 'object' && value !== null) {
        return String(value);
      }
      if (typeof value === 'string') {
        // Remove any control characters and non-printable characters
        return value.replace(/[\u0000-\u001F\u007F-\u009F\u2000-\u200F\uFEFF]/g, '').trim();
      }
      return value;
    });
    
    return JSON.parse(stringified);
  } catch (error) {
    console.warn('Failed to create safe JSON data:', error);
    return null;
  }
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
    
    // Create completely safe, minimal data structures
    const safeTargetDetails = targetDetails ? {
      order_number: String(targetDetails.order_number || '').slice(0, 50),
      customer_name: String(targetDetails.customer_name || '').slice(0, 100)
    } : null;
    
    const safeOldValues = oldValues ? {
      status: String(oldValues.status || '').slice(0, 50)
    } : null;
    
    const safeNewValues = newValues ? {
      status: String(newValues.status || '').slice(0, 50)
    } : null;
    
    const safeDescription = String(description || '').slice(0, 500);
    
    // Double-check by creating safe JSON
    const finalTargetDetails = createSafeJsonData(safeTargetDetails);
    const finalOldValues = createSafeJsonData(safeOldValues);
    const finalNewValues = createSafeJsonData(safeNewValues);
    
    const { data, error } = await supabase.rpc('log_admin_activity', {
      p_action_type: actionType,
      p_target_type: targetType,
      p_target_id: targetId || null,
      p_target_details: finalTargetDetails,
      p_old_values: finalOldValues,
      p_new_values: finalNewValues,
      p_description: safeDescription
    });

    if (error) {
      console.error('Error logging activity:', error);
      return null;
    }

    console.log('Activity logged successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
};

// Simplified helper functions that only pass essential data
export const activityLogger = {
  orderStatusUpdate: (orderId: string, orderNumber: string, customerName: string, oldStatus: string, newStatus: string, adminName: string) => {
    // Create completely safe strings
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeOldStatus = String(oldStatus || '').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeNewStatus = String(newStatus || '').replace(/[^\w\s-]/g, '').slice(0, 50);
    
    return logActivity({
      actionType: 'status_update',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: safeOrderNumber, 
        customer_name: safeCustomerName 
      },
      oldValues: { status: safeOldStatus },
      newValues: { status: safeNewStatus },
      description: `${safeAdminName} updated order ${safeOrderNumber} status from ${safeOldStatus} to ${safeNewStatus}`
    });
  },

  orderCancel: (orderId: string, orderNumber: string, customerName: string, adminName: string) => {
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    
    return logActivity({
      actionType: 'order_cancel',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: safeOrderNumber, 
        customer_name: safeCustomerName 
      },
      description: `${safeAdminName} cancelled order ${safeOrderNumber} for ${safeCustomerName}`
    });
  },

  orderCreate: (orderId: string, orderNumber: string, customerName: string, totalAmount: number, adminName: string) => {
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeTotalAmount = Number(totalAmount) || 0;
    
    return logActivity({
      actionType: 'order_create',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: safeOrderNumber, 
        customer_name: safeCustomerName,
        total_amount: safeTotalAmount
      },
      description: `${safeAdminName} created order ${safeOrderNumber} for ${safeCustomerName} ($${safeTotalAmount})`
    });
  },

  orderEdit: (orderId: string, orderNumber: string, customerName: string, changes: any, adminName: string) => {
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    
    return logActivity({
      actionType: 'order_edit',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: safeOrderNumber, 
        customer_name: safeCustomerName 
      },
      oldValues: changes?.oldValues ? { summary: 'Order details changed' } : null,
      newValues: changes?.newValues ? { summary: 'Order details updated' } : null,
      description: `${safeAdminName} edited order ${safeOrderNumber} for ${safeCustomerName}`
    });
  },

  invoiceSend: (invoiceId: string, orderNumber: string, customerEmail: string, amount: number, adminName: string) => {
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeCustomerEmail = String(customerEmail || '').replace(/[^\w\s@.-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAmount = Number(amount) || 0;
    
    return logActivity({
      actionType: 'invoice_send',
      targetType: 'invoice',
      targetId: invoiceId,
      targetDetails: { 
        order_number: safeOrderNumber, 
        customer_email: safeCustomerEmail,
        amount: safeAmount
      },
      description: `${safeAdminName} sent invoice for order ${safeOrderNumber} to ${safeCustomerEmail} ($${safeAmount})`
    });
  },

  paymentUpdate: (orderId: string, orderNumber: string, oldStatus: string, newStatus: string, adminName: string) => {
    const safeOrderNumber = String(orderNumber || 'Unknown').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeOldStatus = String(oldStatus || '').replace(/[^\w\s-]/g, '').slice(0, 50);
    const safeNewStatus = String(newStatus || '').replace(/[^\w\s-]/g, '').slice(0, 50);
    
    return logActivity({
      actionType: 'payment_update',
      targetType: 'payment',
      targetId: orderId,
      targetDetails: { order_number: safeOrderNumber },
      oldValues: { payment_status: safeOldStatus },
      newValues: { payment_status: safeNewStatus },
      description: `${safeAdminName} updated payment status for order ${safeOrderNumber} from ${safeOldStatus} to ${safeNewStatus}`
    });
  },

  customerCreate: (customerId: string, customerName: string, customerEmail: string, adminName: string) => {
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeCustomerEmail = String(customerEmail || '').replace(/[^\w\s@.-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    
    return logActivity({
      actionType: 'customer_create',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { 
        customer_name: safeCustomerName, 
        customer_email: safeCustomerEmail 
      },
      description: `${safeAdminName} created customer ${safeCustomerName} (${safeCustomerEmail})`
    });
  },

  customerEdit: (customerId: string, customerName: string, changes: any, adminName: string) => {
    const safeCustomerName = String(customerName || 'Unknown Customer').replace(/[^\w\s-]/g, '').slice(0, 100);
    const safeAdminName = String(adminName || 'Unknown Admin').replace(/[^\w\s-]/g, '').slice(0, 100);
    
    return logActivity({
      actionType: 'customer_edit',
      targetType: 'customer',
      targetId: customerId,
      targetDetails: { customer_name: safeCustomerName },
      oldValues: changes?.oldValues ? { summary: 'Customer details changed' } : null,
      newValues: changes?.newValues ? { summary: 'Customer details updated' } : null,
      description: `${safeAdminName} edited customer ${safeCustomerName}`
    });
  }
};
