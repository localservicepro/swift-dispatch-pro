
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderPricingFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
}

export function OrderPricingForm({ formData, onInputChange }: OrderPricingFormProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label htmlFor="subtotal">Subtotal</Label>
        <Input
          id="subtotal"
          type="number"
          step="0.01"
          value={formData.subtotal.toString()}
          onChange={(e) => onInputChange('subtotal', e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="delivery_fee">Delivery Fee</Label>
        <Input
          id="delivery_fee"
          type="number"
          step="0.01"
          value={formData.delivery_fee.toString()}
          readOnly
          className="bg-gray-100"
        />
      </div>
      <div>
        <Label htmlFor="total_amount">Total Amount</Label>
        <Input
          id="total_amount"
          type="number"
          step="0.01"
          value={formData.total_amount}
          readOnly
          className="bg-gray-100"
        />
      </div>
    </div>
  );
}
