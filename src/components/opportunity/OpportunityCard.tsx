
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotesDisplaySection } from "../notes/NotesDisplaySection";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { ProofOfDeliveryDialog } from "../order/ProofOfDeliveryDialog";
import { useDeliveryPhotos } from "@/hooks/useDeliveryPhotos";
import { OpportunityCardHeader } from "./OpportunityCardHeader";
import { OpportunityCardInfo } from "./OpportunityCardInfo";
import { OpportunityCardActionButton } from "./OpportunityCardActionButton";
import { OpportunityCardCompleted } from "./OpportunityCardCompleted";
import { getCustomerTypeColors, getDeliveryMethodColors, getDeliveryMethodLabel } from "@/utils/customerTypeColors";
import { cn } from "@/lib/utils";
import { Package, AlertTriangle, ArrowRightLeft } from "lucide-react";

interface OpportunityCardProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
  onOrderClick: (order: any) => void;
}

export function OpportunityCard({ order, currentStage, onOrderMove, onOrderClick }: OpportunityCardProps) {
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);

  // Fetch delivery photos for delivered orders
  const { data: deliveryPhotos } = useDeliveryPhotos(
    currentStage === 'delivered' ? order.id : null
  );
  const hasDeliveryPhotos = deliveryPhotos && deliveryPhotos.length > 0;

  // Get colors based on delivery method first, then customer type
  const deliveryMethodColors = getDeliveryMethodColors(order.delivery_method);
  const customerTypeColors = getCustomerTypeColors(order.customer_type, order.payment_status);
  
  // Use delivery method colors for pickup_delivery orders, otherwise use customer type colors
  const colors = order.delivery_method === 'pickup_delivery' ? deliveryMethodColors : customerTypeColors;

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

  return (
    <>
      <Card 
        className={cn(
          "hover:shadow-md transition-all cursor-pointer group",
          colors.card,
          colors.border,
          colors.hoverBorder,
          colors.leftBorder
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          {/* Payment Status Warning for pending payments */}
          {order.payment_status === 'pending' && (
            <div className="mb-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded p-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Payment Pending</span>
            </div>
          )}

          {/* Delivery Method Badge for pickup_delivery orders */}
          {order.delivery_method === 'pickup_delivery' && (
            <div className="mb-3 flex items-center gap-2 text-purple-600 bg-purple-50 border border-purple-200 rounded p-2">
              <ArrowRightLeft className="w-4 h-4" />
              <span className="text-xs font-medium">{getDeliveryMethodLabel(order.delivery_method)}</span>
            </div>
          )}

          {/* Header */}
          <OpportunityCardHeader
            order={order}
            currentStage={currentStage}
            hasDeliveryPhotos={hasDeliveryPhotos}
            onOrderMove={onOrderMove}
            onNotesEdit={handleNotesEdit}
            onViewProof={handleViewProof}
          />

          {/* Order Information */}
          <OpportunityCardInfo order={order} />

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
          <OpportunityCardActionButton
            order={order}
            currentStage={currentStage}
            onOrderMove={onOrderMove}
          />

          {/* Completed Orders Section */}
          {currentStage === 'delivered' && (
            <OpportunityCardCompleted
              hasDeliveryPhotos={hasDeliveryPhotos}
              onViewProof={handleViewProof}
            />
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
