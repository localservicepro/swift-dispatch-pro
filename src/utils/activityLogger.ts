
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

/**
 * Sanitizes data to ensure it's safe for JSONB storage
 * Removes circular references, functions, and converts to simple key-value pairs
 */
const sanitizeForJsonb = (data: any): Record<string, string | number | boolean> | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  try {
    const sanitized: Record<string, string | number | boolean> = {};
    
    // Only process simple, safe properties
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (value === null || value === undefined) {
        return; // Skip null/undefined values
      }
      
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (typeof value === 'object') {
        // Convert objects to string representations
        try {
          sanitized[key] = JSON.stringify(value);
        } catch {
          sanitized[key] = '[Object]';
        }
      } else {
        sanitized[key] = String(value);
      }
    });

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  } catch (error) {
    console.warn('Failed to sanitize data for JSONB:', error);
    return null;
  }
};

/**
 * Logs activity with aggressive error handling and sanitization
 * This function will never throw an error to prevent disrupting main functionality
 */
export const logActivity = async ({
  actionType,
  targetType,
  targetId,
  targetDetails,
  oldValues,
  newValues,
  description
}: LogActivityParams): Promise<void> => {
  // Use setTimeout to make this completely non-blocking
  setTimeout(async () => {
    try {
      console.log('Attempting to log activity:', { actionType, targetType, description });
      
      // Sanitize all JSONB data
      const sanitizedTargetDetails = sanitizeForJsonb(targetDetails);
      const sanitizedOldValues = sanitizeForJsonb(oldValues);
      const sanitizedNewValues = sanitizeForJsonb(newValues);

      const { data, error } = await supabase.rpc('log_admin_activity', {
        p_action_type: actionType,
        p_target_type: targetType,
        p_target_id: targetId || null,
        p_target_details: sanitizedTargetDetails,
        p_old_values: sanitizedOldValues,
        p_new_values: sanitizedNewValues,
        p_description: description
      });

      if (error) {
        console.warn('Activity logging failed (non-critical):', error);
        return;
      }

      console.log('Activity logged successfully:', data);
    } catch (error) {
      console.warn('Activity logging failed (non-critical):', error);
      // Never throw errors from logging
    }
  }, 0);
};

// Simplified helper functions for common activities with minimal data
export const activityLogger = {
  orderStatusUpdate: (orderId: string, orderNumber: string, customerName: string, oldStatus: string, newStatus: string, adminName: string) =>
    logActivity({
      actionType: 'status_update',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: orderNumber, 
        customer_name: customerName 
      },
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      description: `${adminName} updated order ${orderNumber} status from ${oldStatus} to ${newStatus}`
    }),

  orderCancel: (orderId: string, orderNumber: string, customerName: string, adminName: string) =>
    logActivity({
      actionType: 'order_cancel',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: orderNumber, 
        customer_name: customerName 
      },
      description: `${adminName} cancelled order ${orderNumber} for ${customerName}`
    }),

  orderCreate: (orderId: string, orderNumber: string, customerName: string, totalAmount: number, adminName: string) =>
    logActivity({
      actionType: 'order_create',
      targetType: 'order',
      targetId: orderId,
      targetDetails: { 
        order_number: orderNumber, 
        customer_name: customerName, 
        total_amount: totalAmount 
      },
      description: `${adminName} created order ${orderNumber} for ${customerName} ($${totalAmount})`
    })
};
