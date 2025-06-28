
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, FileText } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderPricingFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
}

export function OrderPricingForm({ formData, onInputChange }: OrderPricingFormProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-900">Pricing & Details</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="subtotal" className="text-gray-700 font-medium">Subtotal</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            value={formData.subtotal?.toString() || ''}
            onChange={(e) => onInputChange('subtotal', e.target.value)}
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
          />
        </div>
        <div>
          <Label htmlFor="delivery_fee" className="text-gray-700 font-medium">Delivery Fee</Label>
          <Input
            id="delivery_fee"
            type="number"
            step="0.01"
            value={formData.delivery_fee?.toString() || ''}
            onChange={(e) => onInputChange('delivery_fee', e.target.value)}
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-200"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="total_amount" className="text-gray-700 font-medium">Total Amount</Label>
        <Input
          id="total_amount"
          type="number"
          step="0.01"
          value={formData.total_amount}
          onChange={(e) => onInputChange('total_amount', e.target.value)}
          required
          className="border-amber-200 focus:border-amber-400 focus:ring-amber-200 font-semibold"
        />
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
