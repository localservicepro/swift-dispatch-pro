
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit3, Camera, Package } from "lucide-react";
import { PaymentStatusDropdown } from "./PaymentStatusDropdown";
import { NotesIndicator } from "../notes/NotesIndicator";
import { PurchaseOrderDisplay } from "../order/PurchaseOrderDisplay";
import { MixedStockBadge } from "../order/MixedStockBadge";
import { useStockStatus } from "@/hooks/useStockStatus";

interface OpportunityCardHeaderProps {
  order: any;
  currentStage: string;
  hasDeliveryPhotos: boolean;
  onOrderMove: () => void;
  onNotesEdit: (e: React.MouseEvent) => void;
  onViewProof: (e: React.MouseEvent) => void;
  onStockSplit?: (e: React.MouseEvent) => void;
}

export function OpportunityCardHeader({ 
  order, 
  currentStage, 
  hasDeliveryPhotos, 
  onOrderMove, 
  onNotesEdit, 
  onViewProof,
  onStockSplit
}: OpportunityCardHeaderProps) {
  const { hasMixedStock } = useStockStatus(order.id);
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-slate-800 text-sm">{order.order_number}</h3>
        {order.status === 'back_order' && (
          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
            <Package className="w-3 h-3 mr-1" />
            Back Order
          </Badge>
        )}
        <PurchaseOrderDisplay 
          purchaseOrder={order.purchase_order}
          variant="secondary"
          showIcon={false}
        />
        {hasMixedStock && <MixedStockBadge size="sm" />}
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
        {/* Stock Split Button for Mixed Stock Orders */}
        {hasMixedStock && currentStage !== 'delivered' && order.status !== 'back_order' && onStockSplit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStockSplit}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Handle Mixed Stock"
          >
            <Package className="w-3 h-3 text-amber-600" />
          </Button>
        )}
        {/* View Proof Button for Delivered Orders */}
        {currentStage === 'delivered' && hasDeliveryPhotos && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewProof}
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
            onClick={onNotesEdit}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            data-notes-edit
          >
            <Edit3 className="w-3 h-3 text-slate-500 hover:text-slate-700" />
          </Button>
        )}
      </div>
    </div>
  );
}
