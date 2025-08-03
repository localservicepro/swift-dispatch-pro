
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Calculator } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderPricingFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
  calculationBreakdown?: any;
  paymentSettings?: any;
}

export function OrderPricingForm({ 
  formData, 
  onInputChange, 
  calculationBreakdown,
  paymentSettings 
}: OrderPricingFormProps) {
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
          type="number"
          step="0.01"
          value={formData.adjustments?.toString() || '0'}
          onChange={(e) => onInputChange('adjustments', e.target.value)}
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
          value={formData.payment_method}
          onChange={(e) => onInputChange('payment_method', e.target.value)}
          className="w-full px-3 py-2 border border-amber-200 rounded-md focus:border-amber-400 focus:ring-amber-200"
        >
          <option value="cash">Cash</option>
          <option value="card_on_file">Card on File</option>
          <option value="invoice">Invoice</option>
          <option value="7_day_invoice">7 Day Invoice</option>
          <option value="in_yard_cash">In Yard - Cash</option>
          <option value="in_yard_card">In Yard - Card</option>
          <option value="account_cash">Account - Cash</option>
          <option value="account_card">Account - Card</option>
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
          
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>AU${safeToFixed(breakdown.deliveryFee)}</span>
          </div>
          
          {breakdown.hasSurcharge && breakdown.surchargeAmount > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Surcharge ({paymentSettings?.service_charge_rate || 0}%):</span>
              <span>AU${safeToFixed(breakdown.surchargeAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-blue-600">
            <span>{paymentSettings?.gst_label || 'GST'} ({paymentSettings?.gst_rate || 10}%):</span>
            <span>AU${safeToFixed(breakdown.gstAmount)}</span>
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>AU${safeToFixed(breakdown.totalAmount)}</span>
          </div>
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

      <div>
        <Label htmlFor="special_instructions" className="text-gray-700 font-medium">
          <FileText className="w-4 h-4 inline mr-1" />
          Special Instructions
        </Label>
        <Textarea
          id="special_instructions"
          value={formData.special_instructions || ''}
          onChange={(e) => onInputChange('special_instructions', e.target.value)}
          placeholder="Any special delivery instructions..."
          className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
        />
      </div>
    </div>
  );
}
