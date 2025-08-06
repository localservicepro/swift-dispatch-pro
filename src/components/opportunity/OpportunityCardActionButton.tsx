
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
    const stages = ['on_hold', 'requested', 'preparing', 'loading', 'en_route', 'delivered'];
    const currentIndex = stages.indexOf(current);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const getNextStageAction = (current: string) => {
    switch (current) {
      case 'on_hold': return 'Move to Requested';
      case 'requested': return 'Start Preparing';
      case 'preparing': return 'Start Loading';
      case 'loading': return 'En Route';
      case 'en_route': return 'Mark Delivered';
      default: return null;
    }
  };

  const canMoveToNextStage = (current: string) => {
    return true; // Always allow progression to next stage
  };

  const moveToNextStage = async () => {
    const nextStage = getNextStage(currentStage);
    if (!nextStage || isMoving) return;

    // No restrictions - allow progression to any stage

    setIsMoving(true);
    try {
      let updateData: any = {};
      
      switch (nextStage) {
        case 'requested':
          updateData = { status: 'requested' };
          break;
        case 'preparing':
          updateData = { status: 'preparing' };
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
        if (nextStage === 'preparing') {
          await activityLogger.orderStatusUpdate(
            order.id,
            order.order_number,
            order.customer_name,
            'requested',
            'preparing',
            profile.full_name
          );
        } else {
          await activityLogger.orderStatusUpdate(
            order.id,
            order.order_number,
            order.customer_name,
            order.status,
            updateData.status,
            profile.full_name
          );
        }
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
  const canMove = canMoveToNextStage(currentStage);

  if (!nextAction || currentStage === 'delivered') {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={canMove ? moveToNextStage : undefined}
      disabled={isMoving || !canMove}
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
