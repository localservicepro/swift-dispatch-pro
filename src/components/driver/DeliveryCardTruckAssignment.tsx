
import { getTruckInfo } from "@/utils/truckUtils";
import { Truck, User } from "lucide-react";

interface DeliveryCardTruckAssignmentProps {
  order: any;
}

export function DeliveryCardTruckAssignment({ order }: DeliveryCardTruckAssignmentProps) {
  // Use denormalized truck_type_display field or fallback to truck_type
  const truckType = order.truck_type_display || order.truck_type;
  const truckInfo = getTruckInfo(truckType);

  // Check if we have truck information using denormalized fields
  if (!order.truck_type_display && !order.truck_registration && !order.truck_type) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-5 h-5 text-blue-600" />
        <span className="text-sm font-medium text-blue-800">Your Assigned Truck</span>
      </div>
      
      {/* Truck Type and Registration Combined using denormalized fields */}
      {order.truck_type_display && order.truck_registration && (
        <div className="mb-2">
          <div className="text-lg font-bold text-blue-900">
            {order.truck_type_display} - {order.truck_registration}
          </div>
        </div>
      )}
      
      {/* Truck Type Details */}
      {truckInfo && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <truckInfo.icon className={`w-4 h-4 ${truckInfo.colorClass}`} />
            <span className={`text-xs px-2 py-0.5 rounded text-white ${truckInfo.colorClass.replace('text-', 'bg-')}`}>
              {truckInfo.capacity}
            </span>
          </div>
        </div>
      )}
      
      {/* Driver Assignment using denormalized field */}
      {order.driver_name && order.driver_name !== 'Not Assigned' && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200">
          <User className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Driver: <span className="font-medium text-blue-800">{order.driver_name}</span>
          </span>
        </div>
      )}
    </div>
  );
}
