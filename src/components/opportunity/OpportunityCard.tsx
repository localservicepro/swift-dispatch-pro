import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  MapPin, 
  Truck,
  ArrowRight,
  Clock,
  CheckCircle
} from "lucide-react";
import { getTruckInfo } from "@/utils/truckUtils";
import { useAuth } from "../auth/AuthProvider";

interface OpportunityCardProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
}

export function OpportunityCard({ order, currentStage, onOrderMove }: OpportunityCardProps) {
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
      console.log(`Moving order ${order.order_number} from ${currentStage} to ${nextStage}`);
      
      // Use the RPC function for consistent status updates
      const { error } = await supabase.rpc('update_order_status', {
        order_id: order.id,
        new_status: nextStage,
        notes: `Status updated from opportunity card: ${currentStage} to ${nextStage}`
      });

      if (error) {
        console.error('RPC error details:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Update payment status if moving to preparing stage
      if (nextStage === 'preparing') {
        const { error: paymentError } = await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', order.id);

        if (paymentError) {
          console.error('Payment status update error:', paymentError);
          // Don't throw here as main status was already updated
        }
      }

      const actionText = getNextStageAction(currentStage);
      toast({
        title: "Order Updated",
        description: `Order ${order.order_number} - ${actionText} completed`,
      });

      onOrderMove();
    } catch (error: any) {
      console.error('OpportunityCard status update error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const getStatusBadge = () => {
    if (order.payment_status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    if (order.payment_status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800">Payment Pending</Badge>;
    }
    return null;
  };

  const truckInfo = getTruckInfo(order.truck_type_from_truck || order.truck_type);
  const nextAction = getNextStageAction(currentStage);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">{order.order_number}</h3>
          {getStatusBadge()}
        </div>

        {/* Customer Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="w-3 h-3" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
          {order.customer_phone && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone className="w-3 h-3" />
              <span>{order.customer_phone}</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-bold text-green-600">${order.total_amount.toFixed(2)}</span>
        </div>

        {/* Additional Info */}
        <div className="space-y-1 mb-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
          
          {order.suburb_name && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>{order.suburb_name}</span>
            </div>
          )}

          {/* Enhanced Truck Information */}
          {(truckInfo || order.truck_registration) && (
            <div className="flex items-center gap-2">
              <Truck className="w-3 h-3" />
              <div className="flex flex-col">
                {truckInfo && (
                  <span>{truckInfo.label}</span>
                )}
                {order.truck_registration && (
                  <span className="font-medium text-slate-700">#{order.truck_registration}</span>
                )}
              </div>
            </div>
          )}

          {order.driver_name && order.driver_name !== 'Not Assigned' && (
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              <span>Driver: {order.driver_name}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {nextAction && currentStage !== 'delivered' && (
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
        )}

        {currentStage === 'delivered' && (
          <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completed
          </div>
        )}
      </CardContent>
    </Card>
  );
}
