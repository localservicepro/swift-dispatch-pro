
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { CheckCircle, XCircle } from "lucide-react";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface DeliveryCardActionsProps {
  order: any;
  onStatusUpdate: () => void;
  onActionDialog: (action: "delivered" | "cancelled") => void;
}

export function DeliveryCardActions({ order, onStatusUpdate, onActionDialog }: DeliveryCardActionsProps) {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const getNextStatus = (currentStatus: string): OrderStatus | null => {
    switch (currentStatus) {
      case 'preparing': return 'loading';
      case 'loading': return 'en_route';
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Start Loading';
      case 'loading': return 'Start Delivery';
      default: return null;
    }
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase.rpc('update_order_status', {
        order_id: order.id,
        new_status: newStatus
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus.replace('_', ' ')}`,
      });

      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const nextStatus = getNextStatus(order.status);
  const statusLabel = getStatusLabel(order.status);

  return (
    <div className="space-y-2">
      {/* Regular status progression button */}
      {nextStatus && statusLabel && (
        <Button
          onClick={() => updateStatus(nextStatus)}
          disabled={updating}
          className="w-full"
          variant="outline"
        >
          {updating ? 'Updating...' : statusLabel}
        </Button>
      )}

      {/* Delivery completion buttons (only show when en_route) */}
      {order.status === 'en_route' && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onActionDialog('delivered')}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Delivered
          </Button>
          <Button
            onClick={() => onActionDialog('cancelled')}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
