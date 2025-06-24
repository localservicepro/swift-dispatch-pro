
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOpportunityData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enhanced cache invalidation function
  const invalidateOrdersCache = async (reason?: string) => {
    console.log(`Invalidating orders cache: ${reason || 'unknown reason'}`);
    
    // Force invalidate all order-related queries
    await queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await queryClient.invalidateQueries({ queryKey: ['deleted-orders'] });
    
    // Force immediate refetch
    await queryClient.refetchQueries({ queryKey: ['opportunity-orders'] });
  };

  // Fetch orders for pipeline (excluding soft-deleted orders)
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['opportunity-orders'],
    queryFn: async () => {
      console.log('Fetching orders for opportunity pipeline...');
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          products,
          total_amount,
          status,
          payment_status,
          driver_id,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_fee,
          subtotal,
          truck_type,
          truck_id,
          deleted_at,
          master_order_id,
          is_split_order,
          customers!orders_customer_id_fkey(
            id,
            suburb_id,
            suburbs(id, name, state, postcode)
          ),
          profiles!orders_driver_id_fkey(full_name),
          trucks!orders_truck_id_fkey(registration_number, truck_type)
        `)
        .is('deleted_at', null) // Exclude soft-deleted orders
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching opportunity orders:', ordersError);
        throw ordersError;
      }

      // Map the data and sort by delivery date/time (earliest first)
      const mappedOrders = ordersData?.map(order => ({
        ...order,
        suburb_id: order.customers?.suburb_id || null,
        suburb_name: order.customers?.suburbs?.name || null,
        suburb_state: order.customers?.suburbs?.state || null,
        suburb_postcode: order.customers?.suburbs?.postcode || null,
        driver_name: order.profiles?.full_name || 'Not Assigned',
        truck_registration: order.trucks?.registration_number || null,
        truck_type_from_truck: order.trucks?.truck_type || order.truck_type
      })) || [];

      // Sort orders by delivery date and time (earliest first), then by creation time
      const sortedOrders = mappedOrders.sort((a, b) => {
        // Helper function to create a comparable date from delivery_date and delivery_time
        const getDeliveryDateTime = (order: any) => {
          if (!order.delivery_date) return null;
          
          // Combine delivery_date and delivery_time into a single Date object
          const dateStr = order.delivery_date;
          const timeStr = order.delivery_time || '00:00:00';
          const combinedDateTime = new Date(`${dateStr}T${timeStr}`);
          
          return combinedDateTime.getTime();
        };

        const aDeliveryTime = getDeliveryDateTime(a);
        const bDeliveryTime = getDeliveryDateTime(b);

        // If both have delivery dates, sort by delivery date/time (earliest first)
        if (aDeliveryTime && bDeliveryTime) {
          return aDeliveryTime - bDeliveryTime;
        }

        // If only one has a delivery date, prioritize the one with delivery date
        if (aDeliveryTime && !bDeliveryTime) return -1;
        if (!aDeliveryTime && bDeliveryTime) return 1;

        // If neither has delivery date, sort by creation time (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('Opportunity orders mapped and sorted by delivery time:', sortedOrders);
      return sortedOrders;
    },
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 0, // Don't cache data for long
  });

  // Set up enhanced real-time subscription for pipeline updates
  useEffect(() => {
    console.log('Setting up enhanced real-time subscription for opportunity pipeline...');
    
    const channel = supabase
      .channel('opportunity-pipeline-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Real-time pipeline update received:', payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Handle deletion events (when deleted_at changes from null to timestamp)
          if (eventType === 'UPDATE' && oldRecord?.deleted_at === null && newRecord?.deleted_at !== null) {
            console.log('Order deletion detected:', newRecord?.order_number);
            
            // Optimistically remove from cache immediately
            queryClient.setQueryData(['opportunity-orders'], (oldData: any[]) => {
              if (!oldData) return [];
              const filtered = oldData.filter(order => order.id !== newRecord.id);
              console.log('Optimistically removed order from cache:', newRecord?.order_number);
              return filtered;
            });
            
            // Show deletion notification
            toast({
              title: "Order Deleted",
              description: `Order ${newRecord?.order_number} has been deleted`,
              duration: 3000,
            });
            
            // Force cache refresh after optimistic update
            await invalidateOrdersCache('order deletion detected');
            return;
          }
          
          // Handle restoration events (when deleted_at changes from timestamp to null)
          if (eventType === 'UPDATE' && oldRecord?.deleted_at !== null && newRecord?.deleted_at === null) {
            console.log('Order restoration detected:', newRecord?.order_number);
            
            toast({
              title: "Order Restored",
              description: `Order ${newRecord?.order_number} has been restored`,
              duration: 3000,
            });
            
            // Force cache refresh for restoration
            await invalidateOrdersCache('order restoration detected');
            return;
          }
          
          // Handle regular status updates
          if (eventType === 'UPDATE' && oldRecord && newRecord) {
            const oldStatus = oldRecord.status;
            const newStatus = newRecord.status;
            const oldPaymentStatus = oldRecord.payment_status;
            const newPaymentStatus = newRecord.payment_status;
            
            if (oldStatus !== newStatus) {
              console.log('Order status changed:', newRecord?.order_number, oldStatus, '->', newStatus);
              toast({
                title: "Pipeline Update",
                description: `Order ${newRecord.order_number} moved to ${newStatus}`,
                duration: 3000,
              });
            }
            
            if (oldPaymentStatus !== newPaymentStatus && newPaymentStatus === 'paid') {
              console.log('Payment confirmed:', newRecord?.order_number);
              toast({
                title: "Payment Confirmed",
                description: `Order ${newRecord.order_number} payment confirmed`,
                duration: 3000,
              });
            }
          }
          
          // Handle new orders
          if (eventType === 'INSERT' && newRecord) {
            console.log('New order detected:', newRecord?.order_number);
            toast({
              title: "New Opportunity",
              description: `Order ${newRecord.order_number} entered pipeline`,
              duration: 3000,
            });
          }
          
          // Invalidate cache for all events except deletion (already handled optimistically)
          if (!(eventType === 'UPDATE' && oldRecord?.deleted_at === null && newRecord?.deleted_at !== null)) {
            await invalidateOrdersCache(`real-time ${eventType}`);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up enhanced real-time pipeline subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return {
    orders,
    isLoading,
    error,
    refetch,
    invalidateOrdersCache
  };
}
