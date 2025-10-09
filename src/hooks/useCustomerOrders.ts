import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCustomerOrders(customerId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`customer_id.eq.${customerId},storefront_customer_id.eq.${customerId}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('soft_delete_order', {
        p_order_id: orderId,
        p_reason: 'Customer cancellation via portal',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders', customerId] });
      toast({
        title: 'Success',
        description: 'Order cancelled successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    },
  });

  return {
    orders: orders || [],
    isLoading,
    refetch,
    cancelOrder: cancelOrder.mutate,
    isCancelling: cancelOrder.isPending,
  };
}
