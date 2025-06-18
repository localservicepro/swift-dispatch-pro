
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, User, MapPin, Clock, Truck, CreditCard, Store } from "lucide-react";
import { Customer, CartItem, Truck as TruckType } from "./types";

interface OrderReviewStepProps {
  customer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  truckType: string;
  driverName: string;
  specialInstructions: string;
  paymentMethod: string;
  selectedTruck: TruckType | null;
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
  deliveryMethod,
  deliveryDate,
  deliveryTime,
  truckType,
  driverName,
  specialInstructions,
  paymentMethod,
  selectedTruck,
  onBack,
  onConfirm,
  isCreating
}: OrderReviewStepProps) {
  const total = subtotal + adjustments + deliveryFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Step {deliveryMethod === "pickup" ? "6" : "8"}: Review Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <User className="w-4 h-4" />
            Customer Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium">{customer.first_name} {customer.last_name}</p>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
            {customer.phone && (
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{customer.full_address}</p>
          </div>
        </div>

        {/* Products */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Package className="w-4 h-4" />
            Products
          </h3>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${item.unit_price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">${item.total_price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Method */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            {deliveryMethod === "delivery" ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            Delivery Method
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <Badge variant={deliveryMethod === "delivery" ? "default" : "secondary"}>
              {deliveryMethod === "delivery" ? "Delivery" : "Yard Sale / Pickup"}
            </Badge>
            {deliveryMethod === "pickup" && (
              <p className="text-sm text-muted-foreground mt-2">
                Customer will pick up from our yard
              </p>  
            )}
          </div>
        </div>

        {/* Delivery Details - Only show for delivery orders */}
        {deliveryMethod === "delivery" && deliveryDate && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="w-4 h-4" />
              Delivery Details
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {deliveryDate} at {deliveryTime}
                </span>
              </div>
              {selectedTruck && (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {selectedTruck.registration_number} ({truckType})
                  </span>
                </div>
              )}
              {driverName && driverName !== "Multiple drivers" && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Driver: {driverName}</span>
                </div>
              )}
              {specialInstructions && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Special Instructions:</p>
                  <p className="text-sm text-muted-foreground">{specialInstructions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <CreditCard className="w-4 h-4" />
            Payment Method
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <Badge variant="outline">
              {paymentMethod === 'cash' ? 'Cash' : 
               paymentMethod === 'card_on_file' ? 'Card on File' : 
               paymentMethod === 'invoice' ? 'Invoice' : paymentMethod}
            </Badge>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold">Order Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span className={adjustments > 0 ? "text-green-600" : "text-red-600"}>
                  ${adjustments > 0 ? '+' : ''}${adjustments.toFixed(2)}
                </span>
              </div>
            )}
            {deliveryMethod === "delivery" && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
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
            {isCreating ? "Creating Order..." : "Create Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
