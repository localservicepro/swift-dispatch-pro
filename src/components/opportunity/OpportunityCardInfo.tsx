
import { 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  MapPin, 
  Truck,
  Clock,
  CalendarDays
} from "lucide-react";
import { getTruckInfo } from "@/utils/truckUtils";
import { formatDeliveryDate, formatDeliveryTime, formatCreatedDate, formatCreatedTime } from "@/utils/dateTimeUtils";

interface OpportunityCardInfoProps {
  order: any;
}

export function OpportunityCardInfo({ order }: OpportunityCardInfoProps) {
  const truckInfo = getTruckInfo(order.truck_type_from_truck || order.truck_type);
  const hasDeliverySchedule = order.delivery_date && order.delivery_time;

  return (
    <>
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
        {/* Delivery Schedule - Show if available */}
        {hasDeliverySchedule && (
          <>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <CalendarDays className="w-3 h-3" />
              <span>Scheduled: {formatDeliveryDate(order.delivery_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-medium">
              <Clock className="w-3 h-3" />
              <span>{formatDeliveryTime(order.delivery_time)}</span>
            </div>
          </>
        )}
        
        {/* Created Date - Always show */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>Created: {formatCreatedDate(order.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{formatCreatedTime(order.created_at)}</span>
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
    </>
  );
}
