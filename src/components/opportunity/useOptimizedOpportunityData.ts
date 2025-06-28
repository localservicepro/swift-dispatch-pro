
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOptimizedOpportunityData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized opportunity orders query
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['optimized-opportunity-orders'],
    queryFn: async () => {
      console.log('Fetching optimized opportunity orders...');
      
      const { data, error } = await supabase
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
        .is('deleted_at', null)
        .order('delivery_date', { ascending: true, nullsLast: true })
        .order('delivery_time', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching optimized opportunity orders:', error);
        throw error;
      }

      return data?.map(order => ({
        ...order,
        suburb_id: order.customers?.suburb_id || null,
        suburb_name: order.customers?.suburbs?.name || null,
        suburb_state: order.customers?.suburbs?.state || null,
        suburb_postcode: order.customers?.suburbs?.postcode || null,
        driver_name: order.profiles?.full_name || 'Not Assigned',
        truck_registration: order.trucks?.registration_number || null,
        truck_type_from_truck: order.trucks?.truck_type || order.truck_type
      })) || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for more frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Optimized cache invalidation
  const invalidateOrdersCache = async (reason?: string) => {
    console.log(`Optimized cache invalidation: ${reason || 'unknown reason'}`);
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['optimized-opportunity-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    ]);
  };

  // Smart real-time updates
  useEffect(() => {
    console.log('Setting up optimized opportunity pipeline subscription...');
    
    const channel = supabase
      .channel('optimized-opportunity-pipeline')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          // Smart cache updates instead of full invalidation
          if (eventType === 'UPDATE' && newRecord && oldRecord) {
            // Update specific order in cache
            queryClient.setQueryData(['optimized-opportunity-orders'], (oldData: any[]) => {
              if (!oldData) return [];
              return oldData.map(order => 
                order.id === newRecord.id ? { ...order, ...newRecord } : order
              );
            });

            // Show relevant notifications
            if (oldRecord.status !== newRecord.status) {
              toast({
                title: "Pipeline Update",
                description: `Order ${newRecord.order_number} moved to ${newRecord.status}`,
                duration: 3000,
              });
            }

            if (oldRecord.payment_status !== newRecord.payment_status && newRecord.payment_status === 'paid') {
              toast({
                title: "Payment Confirmed",
                description: `Order ${newRecord.order_number} payment confirmed`,
                duration: 3000,
              });
            }
          }
          
          // Handle deletions
          if (eventType === 'UPDATE' && oldRecord?.deleted_at === null && newRecord?.deleted_at !== null) {
            queryClient.setQueryData(['optimized-opportunity-orders'], (oldData: any[]) => {
              if (!oldData) return [];
              return oldData.filter(order => order.id !== newRecord.id);
            });
            
            toast({
              title: "Order Deleted",
              description: `Order ${newRecord?.order_number} has been deleted`,
              duration: 3000,
            });
          }
          
          // Handle new orders
          if (eventType === 'INSERT' && newRecord) {
            queryClient.setQueryData(['optimized-opportunity-orders'], (oldData: any[]) => {
              if (!oldData) return [newRecord];
              return [newRecord, ...oldData];
            });
            
            toast({
              title: "New Opportunity",
              description: `Order ${newRecord.order_number} entered pipeline`,
              duration: 3000,
            });
          }

          // Update dashboard metrics
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up optimized opportunity pipeline subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return {
    orders,
    isLoading,
    error,
    invalidateOrdersCache
  };
}
