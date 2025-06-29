
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryActionDialog } from "./DeliveryActionDialog";
import { OrderDetailsCard } from "./OrderDetailsCard";
import { DeliveryMapCard } from "./DeliveryMapCard";
import { DeliveryCardHeader } from "./DeliveryCardHeader";
import { DeliveryCardCustomerInfo } from "./DeliveryCardCustomerInfo";
import { DeliveryCardTruckAssignment } from "./DeliveryCardTruckAssignment";
import { DeliveryCardActions } from "./DeliveryCardActions";
import { Navigation } from "lucide-react";

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
            address={order.customer_address}
            customerName={order.customer_name}
            orderId={order.id}
          />

          {/* Order Details */}
          <OrderDetailsCard order={order} />

          {/* Delivery Notes (For Driver) */}
          {order.delivery_notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Delivery Notes (For Driver):</span>
              </div>
              <div className="text-sm text-blue-700">
                {order.delivery_notes}
              </div>
            </div>
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
