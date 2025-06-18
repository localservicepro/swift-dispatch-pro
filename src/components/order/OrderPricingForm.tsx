
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface OrderPricingFormProps {
  formData: {
    subtotal: number;
    delivery_fee: number;
    total_amount: string;
    adjustments?: number;
    payment_method?: string;
  };
  onInputChange: (field: string, value: string | number) => void;
}

export function OrderPricingForm({ formData, onInputChange }: OrderPricingFormProps) {
  const subtotal = formData.subtotal || 0;
  const deliveryFee = formData.delivery_fee || 0;
  const adjustments = formData.adjustments || 0;
  const totalAmount = parseFloat(formData.total_amount) || 0;
  
  // Calculate if there's a surcharge based on payment method
  const baseTotal = subtotal + adjustments + deliveryFee;
  const surchargeAmount = totalAmount - baseTotal;
  const hasSurcharge = surchargeAmount > 0.01; // Account for rounding

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Pricing Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="subtotal">Subtotal</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            value={subtotal}
            onChange={(e) => onInputChange('subtotal', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <Label htmlFor="adjustments">Adjustments</Label>
          <Input
            id="adjustments"
            type="number"
            step="0.01"
            value={adjustments}
            onChange={(e) => onInputChange('adjustments', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <Label htmlFor="delivery_fee">Delivery Fee</Label>
          <Input
            id="delivery_fee"
            type="number"
            step="0.01"
            value={deliveryFee}
            onChange={(e) => onInputChange('delivery_fee', parseFloat(e.target.value) || 0)}
          />
        </div>

        {hasSurcharge && (
          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
            <strong>Credit Card Surcharge:</strong> ${surchargeAmount.toFixed(2)}
          </div>
        )}

        <div className="border-t pt-2">
          <Label htmlFor="total_amount" className="font-semibold">Total Amount</Label>
          <Input
            id="total_amount"
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={(e) => onInputChange('total_amount', e.target.value)}
            className="font-semibold"
          />
        </div>
      </CardContent>
    </Card>
  );
}
