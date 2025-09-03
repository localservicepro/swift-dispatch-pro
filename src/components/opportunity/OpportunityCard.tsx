
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotesDisplaySection } from "../notes/NotesDisplaySection";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { ProofOfDeliveryDialog } from "../order/ProofOfDeliveryDialog";
import { OrderReturnDialog } from "../order/returns/OrderReturnDialog";
import { ReturnStatusBadge } from "../order/returns/ReturnStatusBadge";
import { useDeliveryPhotos } from "@/hooks/useDeliveryPhotos";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { OpportunityCardHeader } from "./OpportunityCardHeader";
import { OpportunityCardInfo } from "./OpportunityCardInfo";
import { OpportunityCardActionButton } from "./OpportunityCardActionButton";
import { OpportunityCardCompleted } from "./OpportunityCardCompleted";
import { getCustomerTypeColors } from "@/utils/customerTypeColors";
import { cn } from "@/lib/utils";
import { StopCreditIndicator } from "@/components/customer/StopCreditIndicator";
import { RotateCcw } from "lucide-react";

interface OpportunityCardProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
  onOrderClick: (order: any) => void;
}

export function OpportunityCard({ order, currentStage, onOrderMove, onOrderClick }: OpportunityCardProps) {
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  // Fetch delivery photos for delivered orders
  const { data: deliveryPhotos } = useDeliveryPhotos(
    currentStage === 'delivered' ? order.id : null
  );
  const hasDeliveryPhotos = deliveryPhotos && deliveryPhotos.length > 0;

  // Get return stats for this order
  const { getReturnStats, invalidateReturns } = useOrderReturns();
  const returnStats = getReturnStats(order.id);

  // Get customer type colors
  const colors = getCustomerTypeColors(order.customer_type);

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
          <OpportunityCardInfo order={order} onOrderClick={onOrderClick} />

          {/* Return Status Badge */}
          {returnStats.hasReturns && (
            <div className="mb-3">
              <ReturnStatusBadge
                hasReturns={returnStats.hasReturns}
                returnStatus={returnStats.latestReturnStatus}
                totalItemsReturned={returnStats.totalItemsReturned}
              />
            </div>
          )}

          {/* Notes Section */}
          {(order.order_notes?.trim() || order.delivery_notes?.trim()) && (
            <div className="mb-3" data-notes-edit>
              <NotesDisplaySection
                orderNotes={order.order_notes}
                deliveryNotes={order.delivery_notes}
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
            <>
              <OpportunityCardCompleted
                hasDeliveryPhotos={hasDeliveryPhotos}
                onViewProof={handleViewProof}
                deliveredAt={order.delivered_at}
              />
              
              {/* Return Items Button for delivered orders */}
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReturnDialog(true);
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Return Items
                </Button>
              </div>
            </>
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
          deliveryNotes: order.delivery_notes
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

      {/* Return Dialog */}
      <OrderReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        order={order}
        onReturnCreated={() => {
          invalidateReturns();
          onOrderMove(); // Refresh the opportunity data
        }}
      />
    </>
  );
}
