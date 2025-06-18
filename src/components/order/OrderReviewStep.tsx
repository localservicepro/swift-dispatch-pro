
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, User, Package, Truck, Calendar, MapPin, FileText, DollarSign, CreditCard, Edit3 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { getTruckInfo } from "@/utils/truckUtils";
import { useState } from "react";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: number;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  images: string[];
  category?: {
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
  status: string;
  capacity_tons: number | null;
  fuel_type: string | null;
  year_manufactured: number | null;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
}

interface Split {
  id: string;
  name: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  truckType: TruckType;
  truckId: string;
  driverId: string;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
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
  paymentMethod: string;
  selectedTruck?: Truck | null;
  orderType?: string;
  splits?: Split[];
  onBack: () => void;
  onConfirm: () => void;
  isCreating: boolean;
  onSpecialInstructionsChange?: (instructions: string) => void;
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
  paymentMethod,
  selectedTruck,
  orderType = "single",
  splits = [],
  onBack,
  onConfirm,
  isCreating,
  onSpecialInstructionsChange
}: OrderReviewStepProps) {
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [tempInstructions, setTempInstructions] = useState(specialInstructions);

  const total = subtotal + adjustments + deliveryFee;
  const truckInfo = getTruckInfo(truckType);

  const getPaymentMethodDisplay = (method: string) => {
    const methods = {
      'account': { label: 'Account', description: 'Monthly billing cycle', color: 'bg-purple-100 text-purple-800' },
      'card_on_file': { label: 'Card On File', description: 'Saved payment card', color: 'bg-blue-100 text-blue-800' },
      '7_day_invoice': { label: '7 Day Invoice', description: 'Payment due in 7 days', color: 'bg-orange-100 text-orange-800' },
      'in_yard': { label: 'In Yard', description: 'Pay on-site during delivery', color: 'bg-green-100 text-green-800' }
    };
    return methods[method as keyof typeof methods] || { label: method, description: '', color: 'bg-gray-100 text-gray-800' };
  };

  const paymentMethodInfo = getPaymentMethodDisplay(paymentMethod);

  const handleSaveInstructions = () => {
    if (onSpecialInstructionsChange) {
      onSpecialInstructionsChange(tempInstructions);
    }
    setIsEditingInstructions(false);
  };

  const handleCancelEdit = () => {
    setTempInstructions(specialInstructions);
    setIsEditingInstructions(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {orderType === "split" ? "Step 6: Review Split Order" : "Step 5: Create Order"}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Review the order details below. Once created, the order will enter the pipeline as "requested" and await confirmation.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <User className="w-4 h-4" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><strong>Name:</strong> {customer.first_name} {customer.last_name}</div>
            <div><strong>Email:</strong> {customer.email}</div>
            {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
            <div><strong>Type:</strong> <Badge variant="outline">{customer.customer_type}</Badge></div>
            <div className="md:col-span-2"><strong>Address:</strong> {customer.full_address}</div>
          </div>
        </div>

        {/* Products */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Package className="w-4 h-4" />
            Products ({cart.length} items)
          </h3>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{item.product.name}</span>
                  <span className="text-gray-500 ml-2">× {item.quantity}</span>
                </div>
                <span>${item.total_price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" />
            Payment Method
          </h3>
          <div className="flex items-center gap-3">
            <Badge className={paymentMethodInfo.color}>
              {paymentMethodInfo.label}
            </Badge>
            <span className="text-sm text-gray-600">{paymentMethodInfo.description}</span>
          </div>
          {paymentMethod === 'account' && (
            <div className="mt-2 text-xs text-purple-600 bg-purple-50 p-2 rounded">
              This order will be added to the monthly billing cycle for account customer.
            </div>
          )}
        </div>

        {/* Delivery Information - Split vs Single */}
        {orderType === "split" ? (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              Split Order Delivery Details
            </h3>
            <div className="space-y-4">
              {splits.map((split, index) => (
                <div key={split.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{split.name}</h4>
                    <Badge variant="outline">{split.products.length} items</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Date:</strong> {new Date(split.deliveryDate).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {split.deliveryTime}</div>
                    <div><strong>Truck Type:</strong> {getTruckInfo(split.truckType)?.label}</div>
                    <div><strong>Truck ID:</strong> {split.truckId || 'Not assigned'}</div>
                  </div>
                  {split.specialInstructions && (
                    <div className="mt-2 text-sm">
                      <strong>Instructions:</strong> {split.specialInstructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              Delivery Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Date:</strong> {new Date(deliveryDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Time:</strong> {deliveryTime}
              </div>
              <div>
                <strong>Driver:</strong> {driverName || 'Not assigned'}
              </div>
            </div>
          </div>
        )}

        {/* Truck Information - Split vs Single */}
        {orderType === "single" && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4" />
              Truck Assignment
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {truckInfo && (
                  <div className={`p-2 rounded-lg ${truckInfo.bgClass}`}>
                    <truckInfo.icon className={`w-5 h-5 ${truckInfo.colorClass}`} />
                  </div>
                )}
                <div>
                  <div className="font-medium">{truckInfo?.label}</div>
                  <div className="text-sm text-gray-600">{truckInfo?.capacity}</div>
                </div>
              </div>
              
              {selectedTruck && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-blue-900">
                      {selectedTruck.registration_number}
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {selectedTruck.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    {selectedTruck.capacity_tons && (
                      <div>Capacity: {selectedTruck.capacity_tons} tons</div>
                    )}
                    {selectedTruck.fuel_type && (
                      <div>Fuel Type: {selectedTruck.fuel_type}</div>
                    )}
                    {selectedTruck.year_manufactured && (
                      <div>Year: {selectedTruck.year_manufactured}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Special Instructions - Editable */}
        {(specialInstructions || orderType === "single") && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              Special Instructions
              {orderType === "single" && onSpecialInstructionsChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingInstructions(!isEditingInstructions)}
                  className="ml-auto h-6 px-2"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </h3>
            {isEditingInstructions ? (
              <div className="space-y-2">
                <Textarea
                  value={tempInstructions}
                  onChange={(e) => setTempInstructions(e.target.value)}
                  placeholder="Enter special delivery instructions..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveInstructions}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                {specialInstructions || 'No special instructions'}
              </p>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4" />
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span>${adjustments.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Order Status Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Order Status</h4>
              <p className="text-sm text-blue-700">
                {orderType === "split" 
                  ? `This split order with ${splits.length} parts will be created with "requested" status and will appear in the opportunity pipeline.`
                  : "This order will be created with \"requested\" status and will appear in the opportunity pipeline."
                }
                {paymentMethod === 'account' 
                  ? ' It will be added to the monthly billing cycle for this account customer.'
                  : paymentMethod === '7_day_invoice'
                  ? ' An invoice will be automatically generated with 7-day payment terms.'
                  : ' It will need to be confirmed by an admin or when payment is received before processing begins.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isCreating}
            className="ml-auto"
          >
            {isCreating ? "Creating Order..." : `Create ${orderType === "split" ? "Split " : ""}Order`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
