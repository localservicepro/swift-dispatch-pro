
import { getTruckInfo } from "@/utils/truckUtils";
import { Truck, User } from "lucide-react";

interface DeliveryCardTruckAssignmentProps {
  order: any;
}

export function DeliveryCardTruckAssignment({ order }: DeliveryCardTruckAssignmentProps) {
  const truckInfo = getTruckInfo(order.truck_type);

  if (!order.truck_type && !order.truck_registration) {
    return null;
  }

  return (
    <div className="space-y-1 text-xs text-slate-600">
      {/* Truck Type */}
      {truckInfo && (
        <div className="flex items-center gap-2">
          <truckInfo.icon className={`w-4 h-4 ${truckInfo.colorClass}`} />
          <span className="font-medium">{truckInfo.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded text-white ${truckInfo.colorClass.replace('text-', 'bg-')}`}>
            {truckInfo.capacity}
          </span>
        </div>
      )}
      
      {/* Truck Registration */}
      {order.truck_registration && (
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>Registration: <span className="font-medium text-slate-800">#{order.truck_registration}</span></span>
        </div>
      )}
      
      {/* Driver Assignment */}
      {order.driver_name && order.driver_name !== 'Not Assigned' && (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Driver: <span className="font-medium text-slate-800">{order.driver_name}</span></span>
        </div>
      )}
    </div>
  );
}
