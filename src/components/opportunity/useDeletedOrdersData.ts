
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useDeletedOrdersData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch soft-deleted orders
  const { data: deletedOrders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['deleted-orders'],
    queryFn: async () => {
      console.log('Fetching deleted orders...');
      
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
          updated_at,
          deleted_at,
          deleted_by,
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
          deleted_by_profile:profiles!orders_deleted_by_fkey(full_name),
          trucks!orders_truck_id_fkey(registration_number, truck_type)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching deleted orders:', ordersError);
        throw ordersError;
      }

      // Map the data
      const mappedOrders = ordersData?.map(order => ({
        ...order,
        suburb_id: order.customers?.suburb_id || null,
        suburb_name: order.customers?.suburbs?.name || null,
        suburb_state: order.customers?.suburbs?.state || null,
        suburb_postcode: order.customers?.suburbs?.postcode || null,
        driver_name: order.profiles?.full_name || 'Not Assigned',
        deleted_by_name: order.deleted_by_profile?.full_name || 'Unknown',
        truck_registration: order.trucks?.registration_number || null,
        truck_type_from_truck: order.trucks?.truck_type || order.truck_type
      })) || [];

      console.log('Deleted orders mapped:', mappedOrders);
      return mappedOrders;
    },
  });

  const restoreOrder = async (orderId: string, orderNumber: string) => {
    try {
      const { error } = await supabase.rpc('restore_order', {
        p_order_id: orderId
      });

      if (error) throw error;

      toast({
        title: "Order Restored",
        description: `Order ${orderNumber} has been successfully restored`,
      });

      // Refresh both deleted and regular orders
      queryClient.invalidateQueries({ queryKey: ['deleted-orders'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });
      
      refetch();
    } catch (error: any) {
      console.error('Error restoring order:', error);
      toast({
        title: "Error",
        description: "Failed to restore order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const softDeleteOrder = async (orderId: string, orderNumber: string, reason?: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_order', {
        p_order_id: orderId,
        p_reason: reason || 'Admin deletion'
      });

      if (error) throw error;

      toast({
        title: "Order Deleted",
        description: `Order ${orderNumber} has been moved to deleted orders`,
      });

      // Refresh both deleted and regular orders
      queryClient.invalidateQueries({ queryKey: ['deleted-orders'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });
    } catch (error: any) {
      console.error('Error soft deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    deletedOrders,
    isLoading,
    error,
    refetch,
    restoreOrder,
    softDeleteOrder
  };
}
