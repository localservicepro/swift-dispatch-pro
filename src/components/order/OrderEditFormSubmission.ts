
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Order, OrderStatus, TruckType } from "./OrderEditFormTypes";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";
import { activityLogger } from "@/utils/activityLogger";

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
      // Enhanced order change detection for comprehensive logging
      const deliveryAddressChanged = submissionData.customer_address !== (order.delivery_address || order.customer_address);
      const totalAmountChanged = parseFloat(submissionData.total_amount) !== order.total_amount;
      const productsChanged = JSON.stringify(submissionData.products) !== JSON.stringify(order.products);
      const statusChanged = submissionData.status !== order.status;
      
      console.log('Order update analysis:', {
        deliveryAddressChanged,
        totalAmountChanged,
        productsChanged,
        statusChanged,
        oldTotal: order.total_amount,
        newTotal: parseFloat(submissionData.total_amount),
        oldStatus: order.status,
        newStatus: submissionData.status
      });
      
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

      // Enhanced order update with comprehensive data and payment adjustments
      const finalTotalAmount = parseFloat(submissionData.total_amount);
      const updateData = {
        customer_name: submissionData.customer_name,
        purchase_order: submissionData.purchase_order || null,
        customer_phone: submissionData.customer_phone || null,
        customer_address: submissionData.customer_address,
        delivery_address: submissionData.customer_address, // Ensure delivery_address is updated
        products: submissionData.products,
        total_amount: finalTotalAmount,
        subtotal: submissionData.subtotal,
        adjustments: parseFloat(submissionData.adjustments) || 0,
        status: submissionData.status as OrderStatus,
        delivery_date: submissionData.delivery_date || null,
        delivery_time: submissionData.delivery_time || null,
        order_notes: submissionData.order_notes || null,
        delivery_notes: submissionData.delivery_notes || null,
        driver_id: submissionData.driver_id === 'unassigned' ? null : submissionData.driver_id,
        delivery_fee: submissionData.delivery_fee,
        truck_type: submissionData.truck_type === 'none' ? null : submissionData.truck_type as TruckType,
        truck_id: submissionData.truck_id === 'none' ? null : submissionData.truck_id,
        delivery_suburb_id: submissionData.delivery_suburb_id || null,
        // Add contact fields that were missing
        contact_id: submissionData.contact_id || null,
        contact_name: submissionData.contact_name || null,
        contact_email: submissionData.contact_email || null,
        contact_phone: submissionData.contact_phone || null,
        // Add payment method field
        payment_method: submissionData.payment_method || null,
        updated_at: new Date().toISOString(),
      };

      // Handle payment status adjustments when total changes
      if (totalAmountChanged && order.payment_status === 'paid') {
        if (finalTotalAmount > order.total_amount) {
          // Amount increased - mark as pending adjustment
          (updateData as any).payment_status = 'pending_adjustment';
        } else if (finalTotalAmount < order.total_amount) {
          // Amount decreased - keep as paid but log the credit
          console.log(`Order ${order.order_number}: Total decreased from ${order.total_amount} to ${finalTotalAmount}. Credit difference: ${order.total_amount - finalTotalAmount}`);
        }
      }

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

      // Update invoices if they exist and amount changed
      if (totalAmountChanged) {
        const { data: existingInvoices } = await supabase
          .from('invoices')
          .select('id, amount')
          .eq('order_id', order.id)
          .eq('status', 'pending');

        if (existingInvoices && existingInvoices.length > 0) {
          // Update pending invoices with new amount
          await supabase
            .from('invoices')
            .update({ 
              amount: finalTotalAmount,
              updated_at: new Date().toISOString()
            })
            .eq('order_id', order.id)
            .eq('status', 'pending');
        }
      }

      // Enhanced activity logging - create a simple log entry
      if (totalAmountChanged || productsChanged || statusChanged) {
        const logDescription = `Order ${order.order_number} edited by admin - ${[
          totalAmountChanged && `total: ${order.total_amount} → ${finalTotalAmount}`,
          productsChanged && 'products modified', 
          statusChanged && `status: ${order.status} → ${submissionData.status}`
        ].filter(Boolean).join(', ')}`;

        console.log('Order edit activity:', logDescription);

        // Insert activity log directly - get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('activity_logs')
            .insert({
              action_type: 'order_edit',
              target_type: 'order',
              target_id: order.id,
              admin_id: user.id,
              description: logDescription,
              target_details: {
                oldTotal: order.total_amount,
                newTotal: finalTotalAmount,
                oldStatus: order.status,
                newStatus: submissionData.status,
                productsChanged,
                totalAmountChanged,
                statusChanged
              }
            });
        }
      }

      // ENHANCED: Manual cache invalidation after successful order update
      await invalidateOrderCaches(deliveryAddressChanged ? 'delivery address changed' : 'comprehensive order update');

      // Display success toast with defensive error handling
      console.log('✅ ORDER UPDATED SUCCESSFULLY:', order.order_number, {
        totalAmountChanged,
        finalTotal: finalTotalAmount
      });
      
      try {
        console.log('📢 Displaying success toast for order:', order.order_number);
        toast({
          title: "Success",
          description: `Order updated successfully! ${totalAmountChanged ? 'Total amount and payments have been adjusted.' : ''}`,
        });
        console.log('✅ Toast displayed successfully');
      } catch (toastError) {
        console.error('❌ Toast failed to display:', toastError);
        // Fallback: at least show in console
        console.log('%c✅ ORDER UPDATED SUCCESSFULLY', 'color: green; font-size: 16px; font-weight: bold', order.order_number);
      }

      onOrderUpdated();
      onClose();
    } catch (error: any) {
      console.error('❌ ORDER UPDATE FAILED:', error);
      
      try {
        toast({
          title: "Error",
          description: "Failed to update order. Please try again.",
          variant: "destructive",
        });
      } catch (toastError) {
        console.error('❌ Error toast failed to display:', toastError);
        alert('Failed to update order. Please check console for details.');
      }
      throw error;
    }
  };

  return {
    handleOrderSubmission,
    invalidateOrderCaches
  };
}
