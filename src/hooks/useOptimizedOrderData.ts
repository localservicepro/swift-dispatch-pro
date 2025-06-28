
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOptimizedOrderData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized orders query with proper JOINs and indexing
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['optimized-orders'],
    queryFn: async () => {
      console.log('Fetching optimized orders...');
      
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
        .order('created_at', { ascending: false })
        .limit(100); // Implement pagination

      if (error) {
        console.error('Error fetching optimized orders:', error);
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Optimized real-time updates with targeted invalidation
  const invalidateOrdersCache = async (reason?: string) => {
    console.log(`Targeted cache invalidation: ${reason || 'unknown reason'}`);
    
    // Only invalidate specific queries instead of all
    await queryClient.invalidateQueries({ 
      queryKey: ['optimized-orders'],
      exact: true 
    });
  };

  return {
    orders,
    isLoading,
    error,
    invalidateOrdersCache
  };
}
