import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { activityLogger } from "@/utils/activityLogger";

interface OpportunityCardActionButtonProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
}

export function OpportunityCardActionButton({ order, currentStage, onOrderMove }: OpportunityCardActionButtonProps) {
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const getNextStage = (current: string) => {
    const stages = ['requested', 'preparing', 'loading', 'en_route', 'delivered'];
    const currentIndex = stages.indexOf(current);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const getNextStageAction = (current: string) => {
    switch (current) {
      case 'requested': return 'Confirm Order';
      case 'preparing': return 'Start Loading';
      case 'loading': return 'En Route';
      case 'en_route': return 'Mark Delivered';
      default: return null;
    }
  };

  const moveToNextStage = async () => {
    const nextStage = getNextStage(currentStage);
    if (!nextStage || isMoving) return;

    setIsMoving(true);
    try {
      let updateData: any = {};
      
      switch (nextStage) {
        case 'preparing':
          // Always allow progression to preparing, keeping payment status as is
          updateData = { 
            status: 'preparing'
            // Don't modify payment_status - it stays as 'pending' if not paid
          };
          break;
        case 'loading':
          updateData = { status: 'loading' };
          break;
        case 'en_route':
          updateData = { status: 'en_route' };
          break;
        case 'delivered':
          updateData = { status: 'delivered' };
          break;
      }

      const { error } = await supabase
        .from('orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      if (profile?.full_name) {
        await activityLogger.orderStatusUpdate(
          order.id,
          order.order_number,
          order.customer_name,
          currentStage,
          updateData.status,
          profile.full_name
        );
      }

      const actionText = getNextStageAction(currentStage);
      toast({
        title: "Order Updated",
        description: `Order ${order.order_number} - ${actionText} completed`,
      });

      onOrderMove();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const nextAction = getNextStageAction(currentStage);

  if (!nextAction || currentStage === 'delivered') {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={moveToNextStage}
      disabled={isMoving}
      className="w-full flex items-center gap-2 text-xs"
    >
      {currentStage === 'delivered' ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <ArrowRight className="w-3 h-3" />
      )}
      {isMoving ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
          Updating...
        </div>
      ) : (
        nextAction
      )}
    </Button>
  );
}
