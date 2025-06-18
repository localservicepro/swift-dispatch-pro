
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderDeliveryFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
}

export function OrderDeliveryForm({ formData, onInputChange }: OrderDeliveryFormProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="delivery_date">Delivery Date</Label>
          <Input
            id="delivery_date"
            type="date"
            value={formData.delivery_date}
            onChange={(e) => onInputChange('delivery_date', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="delivery_time">Delivery Time</Label>
          <Input
            id="delivery_time"
            type="time"
            value={formData.delivery_time}
            onChange={(e) => onInputChange('delivery_time', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="special_instructions">Special Instructions</Label>
        <Textarea
          id="special_instructions"
          value={formData.special_instructions}
          onChange={(e) => onInputChange('special_instructions', e.target.value)}
          placeholder="Any special delivery instructions..."
        />
      </div>
    </>
  );
}
