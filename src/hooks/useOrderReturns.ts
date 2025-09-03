import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderReturn {
  id: string;
  order_id: string;
  return_date: string;
  returned_items: any[];
  return_reason: string;
  return_notes: string;
  status: string;
  total_items_returned: number;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export function useOrderReturns(orderId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['order-returns', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_returns')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching returns:', error);
        return [];
      }

      return data as OrderReturn[];
    },
    enabled: !!orderId,
  });

  const processReturn = async (returnId: string) => {
    try {
      const { error } = await supabase.rpc('process_return', {
        return_id_param: returnId
      });

      if (error) throw error;

      toast({
        title: "Return Processed",
        description: "The return has been processed and inventory updated.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      return true;
    } catch (error) {
      console.error('Error processing return:', error);
      toast({
        title: "Error",
        description: "Failed to process return. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const invalidateReturns = () => {
    queryClient.invalidateQueries({ queryKey: ['order-returns'] });
  };

  // Calculate return statistics for an order
  const getReturnStats = (orderId: string) => {
    const orderReturns = returns.filter(r => r.order_id === orderId);
    const hasReturns = orderReturns.length > 0;
    const pendingReturns = orderReturns.filter(r => r.status === 'pending').length;
    const totalItemsReturned = orderReturns.reduce((sum, r) => sum + r.total_items_returned, 0);
    const latestReturnStatus = orderReturns[0]?.status;

    return {
      hasReturns,
      pendingReturns,
      totalItemsReturned,
      latestReturnStatus,
      returns: orderReturns
    };
  };

  return {
    returns,
    isLoading,
    processReturn,
    invalidateReturns,
    getReturnStats
  };
}