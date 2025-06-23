
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SplitOrderGroupInfo {
  masterOrderId: string;
  allOrderIds: string[];
  orderNumbers: string[];
  customerName: string;
  totalOrders: number;
  isPartOfGroup: boolean;
}

export function useSplitOrderGroups() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Enhanced cache invalidation for split order operations
  const invalidateAllOrdersCache = async (reason?: string) => {
    console.log(`Invalidating all orders cache for split operations: ${reason || 'unknown reason'}`);
    
    // Invalidate all order-related queries with immediate refetch
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['deleted-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] })
    ]);
    
    // Force immediate refetch for critical queries
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['opportunity-orders'] }),
      queryClient.refetchQueries({ queryKey: ['deleted-orders'] })
    ]);
  };

  // Get split order group info for a specific order
  const getSplitOrderGroupInfo = async (orderId: string): Promise<SplitOrderGroupInfo | null> => {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, master_order_id, is_split_order')
      .eq('id', orderId)
      .single();

    if (error || !order) return null;

    // Determine the master order ID
    const masterOrderId = order.master_order_id || order.id;

    // Get all orders in the group
    const { data: groupOrders, error: groupError } = await supabase
      .from('orders')
      .select('id, order_number')
      .or(`id.eq.${masterOrderId},master_order_id.eq.${masterOrderId}`)
      .is('deleted_at', null)
      .order('created_at');

    if (groupError || !groupOrders) return null;

    return {
      masterOrderId,
      allOrderIds: groupOrders.map(o => o.id),
      orderNumbers: groupOrders.map(o => o.order_number),
      customerName: order.customer_name,
      totalOrders: groupOrders.length,
      isPartOfGroup: groupOrders.length > 1
    };
  };

  // Soft delete entire split order group
  const deleteSplitOrderGroup = async (orderId: string, reason?: string) => {
    try {
      console.log('Deleting split order group for order:', orderId);
      
      // Get group info first for optimistic updates
      const groupInfo = await getSplitOrderGroupInfo(orderId);
      
      if (groupInfo?.allOrderIds) {
        // Optimistically remove all orders in the group from opportunity orders cache
        queryClient.setQueryData(['opportunity-orders'], (oldData: any[]) => {
          if (!oldData) return [];
          const filtered = oldData.filter(order => !groupInfo.allOrderIds.includes(order.id));
          console.log('Optimistically removed split order group from cache:', groupInfo.orderNumbers);
          return filtered;
        });
      }

      // Use the raw SQL call since the function isn't in the generated types yet
      const { data, error } = await supabase
        .rpc('soft_delete_split_order_group' as any, {
          p_order_id: orderId,
          p_reason: reason || 'Admin group deletion'
        });

      if (error) throw error;

      // Type the result manually since it's not in generated types
      const result = data as {
        deleted_order_ids: string[];
        order_numbers: string[];
        customer_name: string;
        total_deleted: number;
      };

      console.log('Split order group deletion result:', result);

      toast({
        title: "Split Order Group Deleted",
        description: `Deleted ${result.total_deleted} orders for ${result.customer_name}: ${result.order_numbers.join(', ')}`,
      });

      // Enhanced cache invalidation
      await invalidateAllOrdersCache('split order group deletion');

      return result;
    } catch (error: any) {
      console.error('Error deleting split order group:', error);
      
      // Revert optimistic updates on error
      await queryClient.refetchQueries({ queryKey: ['opportunity-orders'] });
      
      toast({
        title: "Error",
        description: "Failed to delete split order group. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Restore entire split order group
  const restoreSplitOrderGroup = async (orderId: string) => {
    try {
      console.log('Restoring split order group for order:', orderId);

      // Use the raw SQL call since the function isn't in the generated types yet
      const { data, error } = await supabase
        .rpc('restore_split_order_group' as any, {
          p_order_id: orderId
        });

      if (error) throw error;

      // Type the result manually since it's not in generated types
      const result = data as {
        restored_order_ids: string[];
        order_numbers: string[];
        customer_name: string;
        total_restored: number;
      };

      console.log('Split order group restoration result:', result);

      toast({
        title: "Split Order Group Restored",
        description: `Restored ${result.total_restored} orders for ${result.customer_name}: ${result.order_numbers.join(', ')}`,
      });

      // Enhanced cache invalidation
      await invalidateAllOrdersCache('split order group restoration');

      return result;
    } catch (error: any) {
      console.error('Error restoring split order group:', error);
      toast({
        title: "Error",
        description: "Failed to restore split order group. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    getSplitOrderGroupInfo,
    deleteSplitOrderGroup,
    restoreSplitOrderGroup,
    invalidateAllOrdersCache
  };
}
