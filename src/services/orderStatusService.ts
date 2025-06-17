
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const VALID_ORDER_STATUSES: OrderStatus[] = [
  'preparing',
  'loading',
  'en_route',
  'delivered',
  'cancelled'
];

export const validateOrderStatus = (status: string): status is OrderStatus => {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  adminName?: string
) => {
  console.log(`OrderStatusService: Attempting to update order ${orderId} to status: ${newStatus}`);
  console.log(`Valid statuses:`, VALID_ORDER_STATUSES);
  
  // Validate status
  if (!validateOrderStatus(newStatus)) {
    const error = `Invalid order status: ${newStatus}`;
    console.error(error);
    throw new Error(error);
  }

  try {
    // Get current order data for logging
    console.log(`Fetching current order data for ${orderId}...`);
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, order_number, customer_name')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching current order:', fetchError);
      throw new Error(`Failed to fetch order: ${fetchError.message}`);
    }

    if (!currentOrder) {
      const error = `Order ${orderId} not found`;
      console.error(error);
      throw new Error(error);
    }

    const oldStatus = currentOrder.status;
    console.log(`Order ${orderId} (${currentOrder.order_number}): ${oldStatus} -> ${newStatus}`);

    // Update order status using direct table update (working approach)
    console.log(`Updating order ${orderId} in database...`);
    const { error: updateError, data: updateData } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw new Error(`Failed to update order status: ${updateError.message}`);
    }

    console.log(`Successfully updated order ${orderId} from ${oldStatus} to ${newStatus}`);
    console.log('Update result:', updateData);

    // Return success result with old status for logging
    return {
      success: true,
      oldStatus,
      newStatus,
      orderNumber: currentOrder.order_number,
      customerName: currentOrder.customer_name
    };

  } catch (error: any) {
    console.error(`Order status update failed for ${orderId}:`, {
      error: error,
      message: error?.message,
      code: error?.code,
      details: error?.details
    });
    throw error;
  }
};
