
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOpportunityData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

      // Map the data and sort by time (newest first)
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

      // Sort orders by creation time (newest first)
      const sortedOrders = mappedOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('Opportunity orders mapped and sorted by time:', sortedOrders);
      return sortedOrders;
    },
  });

  // Set up real-time subscription for pipeline updates
  useEffect(() => {
    console.log('Setting up real-time subscription for opportunity pipeline...');
    
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
          
          queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });
          
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            const oldPaymentStatus = payload.old.payment_status;
            const newPaymentStatus = payload.new.payment_status;
            
            if (oldStatus !== newStatus) {
              toast({
                title: "Pipeline Update",
                description: `Order ${payload.new.order_number} moved to ${newStatus}`,
                duration: 3000,
              });
            }
            
            if (oldPaymentStatus !== newPaymentStatus && newPaymentStatus === 'paid') {
              toast({
                title: "Payment Confirmed",
                description: `Order ${payload.new.order_number} payment confirmed`,
                duration: 3000,
              });
            }
          }
          
          if (payload.eventType === 'INSERT' && payload.new) {
            toast({
              title: "New Opportunity",
              description: `Order ${payload.new.order_number} entered pipeline`,
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time pipeline subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return {
    orders,
    isLoading,
    error,
    refetch
  };
}
