
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, User } from "lucide-react";

interface DeliveryLocationCardProps {
  order: any;
}

export function DeliveryLocationCard({ order }: DeliveryLocationCardProps) {
  // Use delivery_address first, fallback to customer_address for backwards compatibility
  const displayAddress = order.delivery_address || order.customer_address;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Delivery Location</h3>
        </div>

        <div className="space-y-3">
          {/* Delivery Address */}
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-slate-800">{order.customer_name}</div>
              <div className="text-sm text-slate-600">{displayAddress}</div>
              {order.suburb_name && (
                <div className="text-xs text-slate-500">
                  {order.suburb_name}, {order.suburb_state}
                </div>
              )}
            </div>
          </div>

          {/* Customer Contact */}
          {order.customer_phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <a 
                href={`tel:${order.customer_phone}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {order.customer_phone}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
