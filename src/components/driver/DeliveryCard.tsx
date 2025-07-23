
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryActionDialog } from "./DeliveryActionDialog";
import { OrderDetailsCard } from "./OrderDetailsCard";
import { DeliveryMapCard } from "./DeliveryMapCard";
import { PickupMapCard } from "./PickupMapCard";
import { DeliveryCardHeader } from "./DeliveryCardHeader";
import { DeliveryLocationCard } from "./DeliveryLocationCard";
import { DeliveryCardTruckAssignment } from "./DeliveryCardTruckAssignment";
import { DeliveryCardActions } from "./DeliveryCardActions";
import { PickupLocationCard } from "./PickupLocationCard";
import { Navigation, ArrowDown } from "lucide-react";

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
  const isPickupDelivery = order.delivery_method === 'pickup_delivery';

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <DeliveryCardHeader order={order} />

          {/* Truck Assignment */}
          <DeliveryCardTruckAssignment order={order} />

          {/* Pickup Section - Only show for pickup_delivery orders */}
          {isPickupDelivery && (
            <>
              <PickupLocationCard order={order} />
              
              {/* Pickup Map */}
              <PickupMapCard
                address={order.pickup_location_address}
                locationName={order.pickup_location_name || 'Pickup Location'}
                orderId={order.id}
              />
              
              {/* Flow Indicator */}
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-sm font-medium">Pickup Complete</span>
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Proceed to Delivery</span>
                </div>
              </div>
            </>
          )}

          {/* Delivery Section */}
          <DeliveryLocationCard order={order} />

          {/* Delivery Map */}
          <DeliveryMapCard
            address={deliveryAddress}
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
