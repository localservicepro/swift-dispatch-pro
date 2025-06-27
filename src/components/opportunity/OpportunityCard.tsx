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
  CheckCircle,
  Eye,
  Edit3,
  Camera
} from "lucide-react";
import { getTruckInfo } from "@/utils/truckUtils";
import { useAuth } from "../auth/AuthProvider";
import { activityLogger } from "@/utils/activityLogger";
import { PaymentStatusDropdown } from "./PaymentStatusDropdown";
import { NotesIndicator } from "../notes/NotesIndicator";
import { NotesDisplaySection } from "../notes/NotesDisplaySection";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { ProofOfDeliveryDialog } from "../order/ProofOfDeliveryDialog";
import { useDeliveryPhotos } from "@/hooks/useDeliveryPhotos";

interface OpportunityCardProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
  onOrderClick: (order: any) => void;
}

export function OpportunityCard({ order, currentStage, onOrderMove, onOrderClick }: OpportunityCardProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Fetch delivery photos for delivered orders
  const { data: deliveryPhotos } = useDeliveryPhotos(
    currentStage === 'delivered' ? order.id : null
  );
  const hasDeliveryPhotos = deliveryPhotos && deliveryPhotos.length > 0;

  const getNextStage = (current: string) => {
    const stages = ['requested', 'preparing', 'loading', 'en_route', 'delivered'];
    const currentIndex = stages.indexOf(current);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
  };

  const getNextStageAction = (current: string) => {
    if (current === 'requested' && order.payment_status === 'pending') {
      return 'Awaiting Payment';
    }
    
    switch (current) {
      case 'requested': return 'Confirm Order';
      case 'preparing': return 'Start Loading';
      case 'loading': return 'En Route';
      case 'en_route': return 'Mark Delivered';
      default: return null;
    }
  };

  const canMoveToNextStage = (current: string) => {
    // If in requested stage with pending payment, cannot move
    if (current === 'requested' && order.payment_status === 'pending') {
      return false;
    }
    return true;
  };

  const moveToNextStage = async () => {
    const nextStage = getNextStage(currentStage);
    if (!nextStage || isMoving) return;

    // Check if move is allowed
    if (!canMoveToNextStage(currentStage)) {
      toast({
        title: "Payment Required",
        description: `Order ${order.order_number} requires payment confirmation before it can be processed`,
        variant: "destructive",
      });
      return;
    }

    setIsMoving(true);
    try {
      let updateData: any = {};
      
      switch (nextStage) {
        case 'preparing':
          // When confirming an order from requested, set payment status to paid and status to preparing
          updateData = { 
            payment_status: 'paid',
            status: 'preparing'
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

      // Log the activity
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons, payment dropdown, or notes edit
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('[role="menuitem"]') ||
        (e.target as HTMLElement).closest('[data-notes-edit]')) {
      return;
    }
    onOrderClick(order);
  };

  const handleNotesEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotesEdit(true);
  };

  const handleViewProof = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProofDialog(true);
  };

  const truckInfo = getTruckInfo(order.truck_type_from_truck || order.truck_type);
  const nextAction = getNextStageAction(currentStage);
  const canMove = canMoveToNextStage(currentStage);

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <>
      <Card 
        className="hover:shadow-md transition-all cursor-pointer border border-slate-200 hover:border-slate-300 group"
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">{order.order_number}</h3>
              <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <NotesIndicator 
                orderNotes={order.order_notes}
                deliveryNotes={order.delivery_notes}
                specialInstructions={order.special_instructions}
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <PaymentStatusDropdown order={order} onStatusUpdate={onOrderMove} />
              {/* View Proof Button for Delivered Orders */}
              {currentStage === 'delivered' && hasDeliveryPhotos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewProof}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View Proof of Delivery"
                >
                  <Camera className="w-3 h-3 text-green-600" />
                </Button>
              )}
              {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNotesEdit}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-notes-edit
                >
                  <Edit3 className="w-3 h-3 text-slate-500 hover:text-slate-700" />
                </Button>
              )}
            </div>
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

          {/* Date and Time Information */}
          <div className="space-y-1 mb-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{formatTime(order.created_at)}</span>
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

          {/* Notes Section */}
          {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
            <div className="mb-3" data-notes-edit>
              <NotesDisplaySection
                orderNotes={order.order_notes}
                deliveryNotes={order.delivery_notes}
                specialInstructions={order.special_instructions}
                compact={true}
                onEditClick={() => setShowNotesEdit(true)}
              />
            </div>
          )}

          {/* Action Button */}
          {nextAction && currentStage !== 'delivered' && (
            <Button
              size="sm"
              onClick={canMove ? moveToNextStage : undefined}
              disabled={isMoving || !canMove}
              className={`w-full flex items-center gap-2 text-xs ${
                !canMove ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border border-yellow-300' : ''
              }`}
              variant={!canMove ? 'outline' : 'default'}
            >
              {currentStage === 'delivered' ? (
                <CheckCircle className="w-3 h-3" />
              ) : !canMove ? (
                <Clock className="w-3 h-3" />
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
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                Completed
              </div>
              {/* View Proof Button for completed orders */}
              {hasDeliveryPhotos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewProof}
                  className="w-full flex items-center gap-2 text-xs text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Camera className="w-3 h-3" />
                  View Proof of Delivery
                </Button>
              )}
            </div>
          )}

          {/* Click hint */}
          <div className="text-xs text-slate-400 text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view details
          </div>
        </CardContent>
      </Card>

      {/* Notes Edit Dialog */}
      <NotesEditDialog
        isOpen={showNotesEdit}
        onClose={() => setShowNotesEdit(false)}
        orderId={order.id}
        orderNumber={order.order_number}
        currentNotes={{
          orderNotes: order.order_notes,
          deliveryNotes: order.delivery_notes,
          specialInstructions: order.special_instructions
        }}
        onNotesUpdated={onOrderMove}
      />

      {/* Proof of Delivery Dialog */}
      <ProofOfDeliveryDialog
        isOpen={showProofDialog}
        onClose={() => setShowProofDialog(false)}
        orderId={order.id}
        orderNumber={order.order_number}
      />
    </>
  );
}
