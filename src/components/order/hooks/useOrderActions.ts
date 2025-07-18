
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { activityLogger } from "@/utils/activityLogger";
import { useAuth } from "../../auth/AuthProvider";
import { useSplitOrderGroups } from "@/hooks/useSplitOrderGroups";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: OrderStatus;
}

export function useOrderActions(refetch: () => void) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { deleteSplitOrderGroup } = useSplitOrderGroups();

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, currentOrder: Order) => {
    try {
      const oldStatus = currentOrder.status;
      
      // Use the database function for proper validation and triggers
      const { error } = await supabase.rpc('update_order_status', {
        order_id: orderId,
        new_status: newStatus,
        notes: null,
        location: null
      });

      if (error) throw error;

      // Log the activity
      if (profile?.full_name) {
        if (newStatus === 'cancelled') {
          await activityLogger.orderCancel(orderId, currentOrder.order_number, currentOrder.customer_name, profile.full_name);
        } else {
          await activityLogger.orderStatusUpdate(orderId, currentOrder.order_number, currentOrder.customer_name, oldStatus, newStatus, profile.full_name);
        }
      }

      toast({
        title: "Status Updated",
        description: `Order ${currentOrder.order_number} status updated to ${newStatus.replace('_', ' ')}`
      });

      refetch();
    } catch (error: any) {
      console.error('Update order status error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, deleteType: 'single' | 'group', deletingOrder: Order) => {
    try {
      if (deleteType === 'group') {
        await deleteSplitOrderGroup(orderId, 'Admin deletion');
      } else {
        const { error } = await supabase.rpc('soft_delete_order', {
          p_order_id: orderId,
          p_reason: 'Admin deletion'
        });

        if (error) throw error;

        if (profile?.full_name) {
          await activityLogger.orderSoftDelete(
            orderId,
            deletingOrder.order_number,
            deletingOrder.customer_name,
            'Admin deletion',
            profile.full_name
          );
        }

        toast({
          title: "Order Deleted",
          description: `Order ${deletingOrder.order_number} has been moved to deleted orders`
        });
      }

      refetch();
    } catch (error: any) {
      console.error('Delete order error:', error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    updateOrderStatus,
    handleDeleteOrder
  };
}
