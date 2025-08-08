
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryActionDialog } from "./DeliveryActionDialog";
import { OrderDetailsCard } from "./OrderDetailsCard";
import { DeliveryMapCard } from "./DeliveryMapCard";
import { DeliveryCardHeader } from "./DeliveryCardHeader";
import { DeliveryCardCustomerInfo } from "./DeliveryCardCustomerInfo";
import { DeliveryCardTruckAssignment } from "./DeliveryCardTruckAssignment";
import { DeliveryCardActions } from "./DeliveryCardActions";
import { NotesDisplaySection } from "@/components/notes/NotesDisplaySection";

interface DeliveryCardProps {
  order: any;
  onStatusUpdate: () => void;
}

export function DeliveryCard({ order, onStatusUpdate }: DeliveryCardProps) {
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "delivered" | "cancelled" | null;
  }>({
    open: false,
    action: null
  });

  const openActionDialog = (action: "delivered" | "cancelled") => {
    setActionDialog({ open: true, action });
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, action: null });
  };

  // Use delivery_address first, fallback to customer_address for backwards compatibility
  const deliveryAddress = order.delivery_address || order.customer_address;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <DeliveryCardHeader order={order} />

          {/* Customer Info */}
          <DeliveryCardCustomerInfo order={order} />

          {/* Prominent Truck Assignment - Moved up for visibility */}
          <DeliveryCardTruckAssignment order={order} />

          {/* Google Maps Integration */}
          <DeliveryMapCard
            address={deliveryAddress}
            customerName={order.customer_name}
            orderId={order.id}
          />

          {/* Order Details */}
          <OrderDetailsCard order={order} />

          {/* Notes Section for Driver */}
          {(order.order_notes?.trim() || order.delivery_notes?.trim()) && (
          <NotesDisplaySection
            orderNotes={order.order_notes}
            deliveryNotes={order.delivery_notes}
            compact={false}
            userRole="driver"
          />
          )}

          {/* Action Buttons */}
          <DeliveryCardActions 
            order={order}
            onStatusUpdate={onStatusUpdate}
            onActionDialog={openActionDialog}
          />
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <DeliveryActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && closeActionDialog()}
        order={order}
        action={actionDialog.action!}
        onStatusUpdate={onStatusUpdate}
      />
    </>
  );
}
