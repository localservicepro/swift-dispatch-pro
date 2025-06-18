
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User, MapPin, Calendar, Truck, CreditCard, Receipt, Loader2 } from "lucide-react";
import { CartItem, Customer, Truck as TruckType } from "./types";
import { supabase } from "@/integrations/supabase/client";

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

interface PaymentSettings {
  gst_rate: number;
  service_charge_rate: number;
  gst_label: string;
  include_gst_in_prices: boolean;
  currency: string;
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
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    gst_rate: 10.00,
    service_charge_rate: 2.50,
    gst_label: 'GST',
    include_gst_in_prices: true,
    currency: 'AUD'
  });

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching payment settings:', error);
        return;
      }

      if (data) {
        setPaymentSettings({
          gst_rate: data.gst_rate,
          service_charge_rate: data.service_charge_rate,
          gst_label: data.gst_label,
          include_gst_in_prices: data.include_gst_in_prices,
          currency: data.currency
        });
      }
    };

    fetchPaymentSettings();
  }, []);

  const baseTotal = subtotal + adjustments + deliveryFee;
  const gstAmount = (baseTotal * paymentSettings.gst_rate) / 100;
  
  // Apply surcharge only for credit card payments
  const surchargeAmount = (paymentMethod === 'card_on_file' || paymentMethod === 'credit_card') 
    ? (baseTotal * paymentSettings.service_charge_rate) / 100 
    : 0;
  
  const totalAmount = baseTotal + gstAmount + surchargeAmount;

  const formatCurrency = (amount: number) => {
    const symbol = paymentSettings.currency === 'AUD' ? '$' : paymentSettings.currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'card_on_file':
        return 'Card on File';
      case '7_day_invoice':
        return '7 Day Invoice';
      case 'in_yard':
        return 'In Yard';
      case 'account':
        return 'Account';
      default:
        return method;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Order Review
        </CardTitle>
        <p className="text-sm text-gray-600">
          Please review your order details before confirming.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">Customer Information</h3>
          </div>
          <div className="pl-6 space-y-1">
            <p><span className="font-medium">Name:</span> {customer.first_name} {customer.last_name}</p>
            <p><span className="font-medium">Email:</span> {customer.email}</p>
            {customer.phone && <p><span className="font-medium">Phone:</span> {customer.phone}</p>}
            <p><span className="font-medium">Address:</span> {customer.full_address}</p>
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold">Order Items</h3>
          </div>
          <div className="pl-6 space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{item.product.name}</span>
                  <span className="text-sm text-gray-500 ml-2">× {item.quantity}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Delivery Information */}
        {deliveryMethod === "delivery" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <h3 className="font-semibold">Delivery Information</h3>
              </div>
              <div className="pl-6 space-y-1">
                {deliveryDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span><span className="font-medium">Date:</span> {new Date(deliveryDate).toLocaleDateString()}</span>
                  </div>
                )}
                {deliveryTime && (
                  <p><span className="font-medium">Time:</span> {deliveryTime}</p>
                )}
                {truckType && truckType !== "split" && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span><span className="font-medium">Truck:</span> {truckType}</span>
                    {selectedTruck && (
                      <Badge variant="outline">{selectedTruck.registration_number}</Badge>
                    )}
                  </div>
                )}
                {driverName && driverName !== "Multiple drivers" && (
                  <p><span className="font-medium">Driver:</span> {driverName}</p>
                )}
                {specialInstructions && (
                  <p><span className="font-medium">Instructions:</span> {specialInstructions}</p>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Payment Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold">Payment Method</h3>
          </div>
          <div className="pl-6">
            <Badge variant="outline">{getPaymentMethodLabel(paymentMethod)}</Badge>
            {surchargeAmount > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                A {paymentSettings.service_charge_rate}% surcharge applies for credit card payments
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Order Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span className={adjustments > 0 ? "text-green-600" : "text-red-600"}>
                  {adjustments > 0 ? "+" : ""}{formatCurrency(adjustments)}
                </span>
              </div>
            )}
            {deliveryMethod === "delivery" && deliveryFee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{paymentSettings.gst_label} ({paymentSettings.gst_rate}%):</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
            {surchargeAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Credit Card Surcharge ({paymentSettings.service_charge_rate}%):</span>
                <span>{formatCurrency(surchargeAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
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
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Order...
              </>
            ) : (
              'Create Order'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
