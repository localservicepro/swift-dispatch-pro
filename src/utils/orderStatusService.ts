
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/utils/emailService";

export async function updateOrderStatus(
  orderId: string, 
  newStatus: string, 
  driverId?: string,
  notes?: string
) {
  try {
    // Get current order details
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        customers!orders_customer_id_fkey(email, first_name, last_name)
      `)
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      throw new Error('Failed to fetch order details');
    }

    const oldStatus = currentOrder.status;

    // Update the order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(driverId && { driver_id: driverId })
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw new Error('Failed to update order status');
    }

    // Send email notification if status changed and customer email exists
    if (oldStatus !== newStatus && currentOrder.customers?.email) {
      try {
        // Get driver name if driver is assigned
        let driverName = 'Unassigned';
        if (updatedOrder.driver_id) {
          const { data: driverProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', updatedOrder.driver_id)
            .single();
          
          if (driverProfile?.full_name) {
            driverName = driverProfile.full_name;
          }
        }

        await emailService.sendDeliveryStatusUpdate({
          customerName: currentOrder.customer_name,
          customerEmail: currentOrder.customers.email,
          orderNumber: currentOrder.order_number,
          oldStatus,
          newStatus,
          driverName,
          notes
        });

        console.log('Status update email sent successfully');
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't throw error to prevent status update failure
      }
    }

    return updatedOrder;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
}
