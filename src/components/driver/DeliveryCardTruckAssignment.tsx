
import { getTruckInfo } from "@/utils/truckUtils";

interface DeliveryCardTruckAssignmentProps {
  order: any;
}

export function DeliveryCardTruckAssignment({ order }: DeliveryCardTruckAssignmentProps) {
  const truckInfo = getTruckInfo(order.truck_type);

  if (!order.truck_type && !order.truck_registration) {
    return null;
  }

  return (
    <div className={`rounded-lg p-3 border ${truckInfo ? truckInfo.bgClass + ' border-' + truckInfo.colorClass.replace('text-', '') + '-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-3">
        {truckInfo && (
          <truckInfo.icon className={`w-5 h-5 ${truckInfo.colorClass}`} />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold ${truckInfo ? truckInfo.colorClass : 'text-gray-700'}`}>
              Assigned Truck
            </span>
          </div>
          <div className="space-y-1">
            {truckInfo && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{truckInfo.label}</span>
                <span className={`text-xs px-2 py-1 rounded ${truckInfo.bgClass} ${truckInfo.colorClass}`}>
                  {truckInfo.capacity}
                </span>
              </div>
            )}
            {order.truck_registration && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Registration:</span>
                <span className="text-sm font-bold text-slate-800 bg-white px-2 py-1 rounded border">
                  {order.truck_registration}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
