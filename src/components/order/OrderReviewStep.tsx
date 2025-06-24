
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, User, MapPin, Clock, CreditCard, Store, Home } from "lucide-react";
import { Customer, CartItem } from "./types";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals, formatCurrency } from "./utils/paymentCalculations";

interface OrderReviewStepProps {
  customer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  paymentMethod: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
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
  specialInstructions,
  paymentMethod,
  deliveryAddress,
  sameAsBilling,
  onBack,
  onConfirm,
  isCreating
}: OrderReviewStepProps) {
  const { data: paymentSettings } = usePaymentSettings();
  const stepNumber = deliveryMethod === "pickup" ? "5" : "7";

  // Calculate totals with payment settings
  const orderTotals = paymentSettings ? 
    calculateOrderTotals(subtotal, adjustments, deliveryFee, paymentMethod, paymentSettings) :
    {
      subtotal,
      adjustments,
      deliveryFee,
      surchargeAmount: 0,
      gstAmount: (subtotal + adjustments + deliveryFee) * 0.1,
      totalAmount: (subtotal + adjustments + deliveryFee) * 1.1,
      hasSurcharge: false,
      surchargeRate: 0,
      gstRate: 10
    };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      'cash': 'Cash',
      'card_on_file': 'Card on File',
      'invoice': 'Invoice',
      '7_day_invoice': '7 Day Invoice',
      'in_yard_cash': 'In Yard - Cash',
      'in_yard_card': 'In Yard - Card',
      'account_cash': 'Account - Cash',
      'account_card': 'Account - Card'
    };
    return labels[method] || method;
  };

  // Determine which address to show for delivery
  const actualDeliveryAddress = sameAsBilling ? customer.full_address : deliveryAddress;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Step {stepNumber}: Review Order
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
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Home className="w-3 h-3" />
                Billing Address:
              </p>
              <p className="text-sm text-muted-foreground">{customer.full_address}</p>
            </div>
          </div>
        </div>

        {/* Delivery Address - Only show for delivery orders and when different from billing */}
        {deliveryMethod === "delivery" && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="w-4 h-4" />
              Delivery Address
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">{actualDeliveryAddress}</p>
              {!sameAsBilling && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Different from billing address
                  </Badge>
                </div>
              )}
              {sameAsBilling && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Same as billing address
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

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
            {deliveryMethod === "delivery" ? <MapPin className="w-4 h-4" /> : <Store className="w-4 h-4" />}
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
              {specialInstructions && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Special Instructions:</p>
                  <p className="text-sm text-muted-foreground">{specialInstructions}</p>
                </div>
              )}
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-700 font-medium">
                  📝 Note: Truck and driver will be assigned after order confirmation
                </p>
              </div>
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
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getPaymentMethodLabel(paymentMethod)}
              </Badge>
              {orderTotals.hasSurcharge && paymentSettings && (
                <Badge variant="secondary" className="text-orange-600 bg-orange-50">
                  +{paymentSettings.service_charge_rate}% surcharge
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold">Order Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(orderTotals.subtotal)}</span>
            </div>
            {orderTotals.adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span className={orderTotals.adjustments > 0 ? "text-green-600" : "text-red-600"}>
                  {orderTotals.adjustments > 0 ? '+' : ''}{formatCurrency(orderTotals.adjustments)}
                </span>
              </div>
            )}
            {deliveryMethod === "delivery" && orderTotals.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{formatCurrency(orderTotals.deliveryFee)}</span>
              </div>
            )}
            {orderTotals.hasSurcharge && orderTotals.surchargeAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Surcharge ({paymentSettings?.service_charge_rate || 0}%):</span>
                <span>{formatCurrency(orderTotals.surchargeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-600">
              <span>{paymentSettings?.gst_label || 'GST'} ({paymentSettings?.gst_rate || 10}%):</span>
              <span>{formatCurrency(orderTotals.gstAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(orderTotals.totalAmount)}</span>
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
