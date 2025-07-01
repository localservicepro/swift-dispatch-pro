
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Order, OrderStatus, TruckType } from "./OrderEditFormTypes";

export function useOrderFormSubmission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced cache invalidation function for order updates
  const invalidateOrderCaches = async (reason?: string) => {
    console.log(`Invalidating order caches after edit: ${reason || 'order update'}`);
    
    // Force invalidate all order-related queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['deleted-orders'] })
    ]);
    
    // Force immediate refetch for opportunity pipeline
    await queryClient.refetchQueries({ queryKey: ['opportunity-orders'] });
    
    console.log('Order caches invalidated and refetched');
  };

  const handleOrderSubmission = async (
    order: Order,
    submissionData: any,
    onOrderUpdated: () => void,
    onClose: () => void
  ) => {
    try {
      // Check if delivery address has changed for enhanced logging
      const deliveryAddressChanged = submissionData.customer_address !== (order.delivery_address || order.customer_address);
      console.log('Order update - delivery address changed:', deliveryAddressChanged);
      
      // If truck assignment changed, update the old truck status and new truck status
      if (submissionData.truck_id !== order.truck_id) {
        // Set old truck back to available if it was assigned
        if (order.truck_id) {
          await supabase
            .from('trucks')
            .update({ status: 'available' })
            .eq('id', order.truck_id);
        }

        // Set new truck to assigned if one is selected
        if (submissionData.truck_id && submissionData.truck_id !== 'none') {
          await supabase
            .from('trucks')
            .update({ status: 'assigned' })
            .eq('id', submissionData.truck_id);
        }
      }

      // Update the order with delivery_address and delivery_suburb_id
      const updateData = {
        customer_name: submissionData.customer_name,
        purchase_order: submissionData.purchase_order || null,
        customer_phone: submissionData.customer_phone || null,
        customer_address: submissionData.customer_address,
        delivery_address: submissionData.customer_address, // Ensure delivery_address is updated
        products: submissionData.products,
        total_amount: parseFloat(submissionData.total_amount),
        subtotal: submissionData.subtotal,
        status: submissionData.status as OrderStatus,
        delivery_date: submissionData.delivery_date || null,
        delivery_time: submissionData.delivery_time || null,
        special_instructions: submissionData.special_instructions || null,
        driver_id: submissionData.driver_id === 'unassigned' ? null : submissionData.driver_id,
        delivery_fee: submissionData.delivery_fee,
        truck_type: submissionData.truck_type === 'none' ? null : submissionData.truck_type as TruckType,
        truck_id: submissionData.truck_id === 'none' ? null : submissionData.truck_id,
        delivery_suburb_id: submissionData.delivery_suburb_id || null,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating order with data:', updateData);

      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update order_items table to reflect product changes
      if (submissionData.products.length > 0) {
        // Delete existing order items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        // Insert updated order items
        const orderItems = submissionData.products.map((item: any) => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          price_adjustment: 0,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error updating order items:', itemsError);
          // Don't throw here as the main order was updated successfully
        }
      }

      // Update the customer's suburb if customer_id exists and suburb changed
      if (order.customer_id && submissionData.suburb_id && submissionData.suburb_id !== order.suburb_id) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            suburb_id: submissionData.suburb_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.customer_id);

        if (customerError) {
          console.error('Error updating customer suburb:', customerError);
          // Don't throw here as the order update was successful
        }
      }

      // ENHANCED: Manual cache invalidation after successful order update
      await invalidateOrderCaches(deliveryAddressChanged ? 'delivery address changed' : 'order data changed');

      toast({
        title: "Success",
        description: "Order updated successfully!",
      });

      onOrderUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    handleOrderSubmission,
    invalidateOrderCaches
  };
}
