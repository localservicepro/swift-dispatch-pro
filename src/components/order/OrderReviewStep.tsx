
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, User, MapPin, Clock, CreditCard, Store, Home, FileText, Truck, Receipt, Building } from "lucide-react";
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
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
  onBack: () => void;
  onConfirm: () => void;
  isCreating: boolean;
  onDeliveryFeeChange?: (fee: number) => void;
  onOrderNotesChange?: (notes: string) => void;
  onDeliveryNotesChange?: (notes: string) => void;
  onPurchaseOrderChange?: (purchaseOrder: string) => void;
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
  orderNotes,
  deliveryNotes,
  purchaseOrder,
  deliveryAddress,
  sameAsBilling,
  onBack,
  onConfirm,
  isCreating,
  onDeliveryFeeChange,
  onOrderNotesChange,
  onDeliveryNotesChange,
  onPurchaseOrderChange
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

  // Determine display name and company info
  const getDisplayInfo = () => {
    // Check for company name (account customers)
    if (customer.company_name) {
      return {
        displayName: customer.company_name,
        contactInfo: `${customer.first_name} ${customer.last_name}`,
        isCompany: true
      };
    }
    
    // Check for business name (business customers)
    if (customer.business_name) {
      return {
        displayName: customer.business_name,
        contactInfo: `${customer.first_name} ${customer.last_name}`,
        isCompany: true
      };
    }
    
    // Default to customer name
    return {
      displayName: `${customer.first_name} ${customer.last_name}`,
      contactInfo: null,
      isCompany: false
    };
  };

  const { displayName, contactInfo, isCompany } = getDisplayInfo();

  const handleDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onDeliveryFeeChange?.(value);
  };

  const handleOrderNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onOrderNotesChange?.(e.target.value);
  };

  const handleDeliveryNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDeliveryNotesChange?.(e.target.value);
  };

  const handlePurchaseOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPurchaseOrderChange?.(e.target.value);
  };

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
            {isCompany ? (
              <Building className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            Customer Information
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div>
              <p className="font-bold text-lg">{displayName}</p>
              {contactInfo && (
                <p className="text-sm text-muted-foreground">Contact: {contactInfo}</p>
              )}
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
            
            {/* Purchase Order Field */}
            <div className="space-y-2">
              <Label htmlFor="purchase-order" className="text-sm font-medium flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                Purchase Order Number
              </Label>
              <Input
                id="purchase-order"
                value={purchaseOrder}
                onChange={handlePurchaseOrderChange}
                placeholder="Enter customer's PO number (optional)"
                disabled={isCreating}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Delivery Address - Only show for delivery orders */}
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
                    AU${item.unit_price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">AU${item.total_price.toFixed(2)}</p>
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

        {/* Order Notes */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <FileText className="w-4 h-4" />
            Order Notes
          </h3>
          <div className="space-y-2">
            <Label htmlFor="order-notes" className="text-sm font-medium">
              Notes for admin and customer (will appear on invoice)
            </Label>
            <Textarea
              id="order-notes"
              value={orderNotes}
              onChange={handleOrderNotesChange}
              placeholder="Add any additional notes or special requirements for this order..."
              className="min-h-[80px]"
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Delivery Notes - Only show for delivery orders */}
        {deliveryMethod === "delivery" && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Truck className="w-4 h-4" />
              Delivery Notes
            </h3>
            <div className="space-y-2">
              <Label htmlFor="delivery-notes" className="text-sm font-medium">
                Internal notes for assigned driver only
              </Label>
              <Textarea
                id="delivery-notes"
                value={deliveryNotes}
                onChange={handleDeliveryNotesChange}
                placeholder="Add delivery-specific instructions for the driver (access codes, special handling, etc.)..."
                className="min-h-[80px]"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                These notes will only be visible to the assigned driver and won't appear on invoices
              </p>
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
              <span>AU${orderTotals.subtotal.toFixed(2)}</span>
            </div>
            {orderTotals.adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span className={orderTotals.adjustments > 0 ? "text-green-600" : "text-red-600"}>
                  {orderTotals.adjustments > 0 ? '+' : ''}AU${orderTotals.adjustments.toFixed(2)}
                </span>
              </div>
            )}
            {deliveryMethod === "delivery" && (
              <div className="flex justify-between items-center">
                <Label htmlFor="delivery-fee">Delivery Fee:</Label>
                <div className="flex items-center gap-2">
                  <span>AU$</span>
                  <Input
                    id="delivery-fee"
                    type="number"
                    value={deliveryFee.toFixed(2)}
                    onChange={handleDeliveryFeeChange}
                    className="w-20 h-8 text-right"
                    min="0"
                    step="0.01"
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}
            {orderTotals.hasSurcharge && orderTotals.surchargeAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Surcharge ({paymentSettings?.service_charge_rate || 0}%):</span>
                <span>AU${orderTotals.surchargeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-600">
              <span>{paymentSettings?.gst_label || 'GST'} ({paymentSettings?.gst_rate || 10}%):</span>
              <span>AU${orderTotals.gstAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>AU${orderTotals.totalAmount.toFixed(2)}</span>
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
