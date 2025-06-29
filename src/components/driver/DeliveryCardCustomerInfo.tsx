
import { MapPin, Phone } from "lucide-react";

interface DeliveryCardCustomerInfoProps {
  order: any;
}

export function DeliveryCardCustomerInfo({ order }: DeliveryCardCustomerInfoProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-slate-700">
        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-slate-800">{order.customer_name}</div>
          <div className="text-sm text-slate-600">{order.customer_address}</div>
          {order.suburb_name && (
            <div className="text-xs text-slate-500">
              {order.suburb_name}, {order.suburb_state}
            </div>
          )}
        </div>
      </div>
      
      {order.customer_phone && (
        <div className="flex items-center gap-2 text-slate-700 ml-6">
          <Phone className="w-4 h-4 text-slate-500" />
          <a 
            href={`tel:${order.customer_phone}`}
            className="text-blue-600 hover:underline text-sm"
          >
            {order.customer_phone}
          </a>
        </div>
      )}
    </div>
  );
}
