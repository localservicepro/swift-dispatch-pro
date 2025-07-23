
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User, Phone, Calendar, Clock, Navigation } from "lucide-react";

interface PickupLocationCardProps {
  order: any;
}

export function PickupLocationCard({ order }: PickupLocationCardProps) {
  if (!order.pickup_location_address) {
    return null;
  }

  return (
    <Card className="bg-purple-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-900">Pickup Location</h3>
        </div>

        <div className="space-y-3">
          {/* Pickup Address */}
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-slate-800">
                {order.pickup_location_name || 'Pickup Location'}
              </div>
              <div className="text-sm text-slate-600">
                {order.pickup_location_address}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {order.pickup_contact_name && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <div>
                <span className="font-medium text-slate-800">{order.pickup_contact_name}</span>
                {order.pickup_contact_phone && (
                  <span className="text-sm text-slate-600 ml-2">
                    • {order.pickup_contact_phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pickup Schedule */}
          {order.pickup_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <div className="text-sm text-slate-600">
                {new Date(order.pickup_date).toLocaleDateString()}
                {order.pickup_time && (
                  <span className="ml-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {order.pickup_time}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pickup Instructions */}
          {order.pickup_instructions && (
            <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <span className="text-sm font-medium text-purple-800">Pickup Instructions:</span>
                  <div className="text-sm text-purple-700 mt-1">
                    {order.pickup_instructions}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
