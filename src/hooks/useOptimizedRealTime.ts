
import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOptimizedRealTime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Optimized real-time subscription with smart updates
  const handleOrderUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log('Optimized real-time update:', eventType, newRecord?.order_number);

    // Smart cache updates instead of full invalidation
    if (eventType === 'INSERT' && newRecord) {
      // Add new order to cache
      queryClient.setQueryData(['optimized-orders'], (oldData: any[]) => {
        if (!oldData) return [newRecord];
        return [newRecord, ...oldData];
      });
      
      toast({
        title: "New Order",
        description: `Order ${newRecord.order_number} created`,
        duration: 3000,
      });
    }
    
    if (eventType === 'UPDATE' && newRecord && oldRecord) {
      // Update specific order in cache
      queryClient.setQueryData(['optimized-orders'], (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.map(order => 
          order.id === newRecord.id ? { ...order, ...newRecord } : order
        );
      });

      // Show relevant notifications
      if (oldRecord.status !== newRecord.status) {
        toast({
          title: "Order Updated",
          description: `Order ${newRecord.order_number} is now ${newRecord.status}`,
          duration: 3000,
        });
      }
    }

    if (eventType === 'DELETE' || (eventType === 'UPDATE' && newRecord?.deleted_at)) {
      // Remove order from cache
      queryClient.setQueryData(['optimized-orders'], (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.filter(order => order.id !== (newRecord?.id || oldRecord?.id));
      });
    }

    // Update dashboard metrics cache
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  }, [queryClient, toast]);

  useEffect(() => {
    console.log('Setting up optimized real-time subscriptions...');
    
    // Single subscription with batching
    const channel = supabase
      .channel('optimized-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        handleOrderUpdate
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up optimized real-time subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [handleOrderUpdate]);

  return { supabase };
}
