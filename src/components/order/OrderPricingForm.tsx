
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Calculator } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { useCustomerCredits } from "@/hooks/useCustomerCredits";
import { formatCurrency } from "./utils/paymentCalculations";

interface OrderPricingFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
  calculationBreakdown?: any;
  paymentSettings?: any;
  orderId?: string;
  customerId?: string;
  deliveryMethod?: string;
  missingFuelSurchargeAmount?: number;
  applyMissingFuelSurcharge?: () => void;
}

export function OrderPricingForm({ 
  formData, 
  onInputChange, 
  calculationBreakdown,
  paymentSettings,
  orderId,
  customerId,
  deliveryMethod,
  missingFuelSurchargeAmount = 0,
  applyMissingFuelSurcharge,
}: OrderPricingFormProps) {
  // Get returns and credits data
  const { returns } = useOrderReturns(orderId);
  const { availableCredits, totalAvailableCredit } = useCustomerCredits(customerId);

  // Calculate total return value
  const totalReturnValue = returns.reduce((sum, returnRecord) => {
    const returnValue = returnRecord.returned_items.reduce((itemSum: number, item: any) => {
      return itemSum + (item.unit_price * item.quantity_returned);
    }, 0);
    return sum + returnValue;
  }, 0);

  // Helper function to safely format currency values
  const safeToFixed = (value: any, decimals: number = 2): string => {
    const num = Number(value) || 0;
    return num.toFixed(decimals);
  };

  const breakdown = calculationBreakdown || {
    subtotal: Number(formData.subtotal) || 0,
    adjustments: Number(formData.adjustments) || 0,
    deliveryFee: Number(formData.delivery_fee) || 0,
    surchargeAmount: 0,
    gstAmount: 0,
    totalAmount: Number(formData.total_amount) || 0,
    hasSurcharge: false
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-900">Pricing & Details</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="subtotal" className="text-gray-700 font-medium">Subtotal (AU$)</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            value={formData.subtotal?.toString() || ''}
            onChange={(e) => onInputChange('subtotal', e.target.value)}
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="delivery_fee" className="text-gray-700 font-medium">Delivery Fee (AU$)</Label>
          <Input
            id="delivery_fee"
            type="number"
            step="0.01"
            value={formData.delivery_fee?.toString() || ''}
            onChange={(e) => onInputChange('delivery_fee', e.target.value)}
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="adjustments" className="text-gray-700 font-medium">Adjustments (AU$)</Label>
        <Input
          id="adjustments"
          type="text"
          inputMode="decimal"
          value={formData.adjustments?.toString() || '0'}
          onChange={(e) => {
            const value = e.target.value;
            // Allow negative sign, digits, and decimal point
            if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
              onInputChange('adjustments', value);
            }
          }}
          className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
          placeholder="0.00"
        />
        <p className="text-xs text-amber-600 mt-1">Use negative values for discounts</p>
      </div>

      {/* Payment Method Selection for Surcharge Calculation */}
      <div>
        <Label htmlFor="payment_method" className="text-gray-700 font-medium">Payment Method</Label>
        <select
          id="payment_method"
          value={formData.payment_method || ''}
          onChange={(e) => onInputChange('payment_method', e.target.value)}
          className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-amber-200"
        >
          <option value="">Not set</option>
          {!isKnownPaymentMethod(formData.payment_method) && formData.payment_method ? (
            <option value={formData.payment_method}>
              {formData.payment_method} (current)
            </option>
          ) : null}
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>


      {/* Calculation Breakdown */}
      <div className="bg-white border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-amber-600" />
          <h4 className="font-medium text-amber-900">Calculation Breakdown</h4>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>AU${safeToFixed(breakdown.subtotal)}</span>
          </div>
          
          {breakdown.adjustments !== 0 && (
            <div className="flex justify-between">
              <span>Adjustments:</span>
              <span className={breakdown.adjustments > 0 ? "text-green-600" : "text-red-600"}>
                {breakdown.adjustments > 0 ? '+' : ''}AU${safeToFixed(breakdown.adjustments)}
              </span>
            </div>
          )}
          
          {Number(formData.fuel_surcharge) > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Fuel Surcharge:</span>
              <span>AU${Number(formData.fuel_surcharge).toFixed(2)}</span>
            </div>
          )}

          {missingFuelSurchargeAmount > 0 && applyMissingFuelSurcharge && (
            <div className="my-2 p-2 rounded border border-amber-300 bg-amber-100 text-xs flex items-center justify-between gap-2">
              <span className="text-amber-900">
                Fuel surcharge missing — apply AU${missingFuelSurchargeAmount.toFixed(2)}?
              </span>
              <button
                type="button"
                onClick={applyMissingFuelSurcharge}
                className="px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium"
              >
                Apply
              </button>
            </div>
          )}

          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>AU${safeToFixed(breakdown.deliveryFee)}</span>
          </div>

          {totalReturnValue > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Returns Credit:</span>
              <span>-AU${safeToFixed(totalReturnValue)}</span>
            </div>
          )}

          {totalAvailableCredit > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Available Credits:</span>
              <span>AU${safeToFixed(totalAvailableCredit)}</span>
            </div>
          )}
          
          {breakdown.hasSurcharge && breakdown.surchargeAmount > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Surcharge ({paymentSettings?.service_charge_rate || 0}%):</span>
              <span>AU${safeToFixed(breakdown.surchargeAmount)}</span>
            </div>
          )}
          
          {breakdown.gstAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{paymentSettings?.gst_label || 'GST'} Included ({paymentSettings?.gst_rate || 10}%):</span>
              <span>AU${safeToFixed(breakdown.gstAmount)}</span>
            </div>
          )}
          
          <Separator className="my-2" />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Net Total:</span>
            <span>AU${safeToFixed(breakdown.totalAmount - totalReturnValue)}</span>
          </div>

          {totalReturnValue > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Original Total: AU${safeToFixed(breakdown.totalAmount)} 
              {totalReturnValue > breakdown.totalAmount ? " - Credit Balance Available" : ""}
            </div>
          )}
        </div>

        {breakdown.hasSurcharge && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-orange-600 bg-orange-50">
              Surcharge applies to this payment method
            </Badge>
          </div>
        )}
      </div>

      {/* Read-only Total Amount Field */}
      <div>
        <Label htmlFor="total_amount" className="text-gray-700 font-medium">Total Amount (AU$)</Label>
        <Input
          id="total_amount"
          type="text"
          value={`AU$${safeToFixed(breakdown.totalAmount)}`}
          readOnly
          className="border-amber-200 bg-gray-50 font-semibold text-lg cursor-not-allowed"
          placeholder="Calculated automatically"
        />
        <p className="text-xs text-amber-600 mt-1">This amount is calculated automatically based on the above values</p>
      </div>

    </div>
  );
}
