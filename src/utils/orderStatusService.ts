import { supabase } from "@/integrations/supabase/client";
import { activityLogger } from "./activityLogger";

interface UpdateOrderStatusParams {
  orderId: string;
  orderNumber: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  notes?: string;
}

export async function updateOrderStatus({
  orderId,
  orderNumber,
  customerName,
  oldStatus,
  newStatus,
  updatedBy,
  notes
}: UpdateOrderStatusParams) {
  // Update the order status
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      status: newStatus as any,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (orderError) throw orderError;

  // Create a delivery status update entry for tracking
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  if (currentUserId) {
    const { error: statusError } = await supabase
      .from('delivery_status_updates')
      .insert({
        order_id: orderId,
        driver_id: currentUserId,
        old_status: oldStatus as any,
        new_status: newStatus as any,
        notes: notes || `Status updated to ${newStatus}`,
        created_at: new Date().toISOString()
      });

    if (statusError) {
      console.warn('Failed to create delivery status update:', statusError);
      // Don't throw here as the order update was successful
    }
  }

  // Log the activity
  await activityLogger.orderStatusUpdate(
    orderId,
    orderNumber,
    customerName,
    oldStatus,
    newStatus,
    updatedBy
  );
}