
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, User, Package, Truck, Calendar, Clock, MapPin, Phone, Mail } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: number;
  };
}

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderReviewStepProps {
  customer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType;
  driverName: string;
  specialInstructions: string;
  onBack: () => void;
  onConfirm: () => void;
  isCreating: boolean;
}

export function OrderReviewStep({
  customer,
  cart,
  subtotal,
  adjustments,
  deliveryFee,
  deliveryDate,
  deliveryTime,
  truckType,
  driverName,
  specialInstructions,
  onBack,
  onConfirm,
  isCreating
}: OrderReviewStepProps) {
  const grandTotal = subtotal + adjustments + deliveryFee;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTruckTypeLabel = (type: TruckType) => {
    const labels = {
      small: 'Small Truck',
      medium: 'Medium Truck',
      large: 'Large Truck',
      refrigerated: 'Refrigerated Truck'
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Step 4: Review Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Details */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />
            Customer Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">
                {customer.first_name} {customer.last_name}
              </h4>
              <Badge variant={customer.customer_type === 'trade' ? 'default' : 'secondary'}>
                {customer.customer_type.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  {customer.phone}
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                {customer.full_address}
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Order Items ({cart.length} items)
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={item.product.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-gray-600">
                      ${item.unit_price.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium">
                    ${item.total_price.toFixed(2)}
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                {adjustments !== 0 && (
                  <div className="flex justify-between">
                    <span>Adjustments:</span>
                    <span className={adjustments > 0 ? "text-red-600" : "text-green-600"}>
                      {adjustments > 0 ? '+' : ''}${adjustments.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Delivery Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Date:</span>
              <span>{formatDate(deliveryDate)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Time:</span>
              <span>{formatTime(deliveryTime)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Truck Type:</span>
              <span>{getTruckTypeLabel(truckType)}</span>
            </div>
            
            {driverName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Driver:</span>
                <span>{driverName}</span>
              </div>
            )}
            
            {specialInstructions && (
              <div className="pt-2 border-t">
                <span className="font-medium">Special Instructions:</span>
                <p className="text-sm text-gray-600 mt-1">{specialInstructions}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack} disabled={isCreating}>
            Back
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isCreating}
            className="ml-auto"
          >
            {isCreating ? 'Creating Order...' : 'Create Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
