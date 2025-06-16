
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderBasicInfoFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
}

export function OrderBasicInfoForm({ formData, onInputChange }: OrderBasicInfoFormProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={(e) => onInputChange('customer_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="customer_phone">Customer Phone</Label>
          <Input
            id="customer_phone"
            value={formData.customer_phone}
            onChange={(e) => onInputChange('customer_phone', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customer_address">Customer Address</Label>
        <Textarea
          id="customer_address"
          value={formData.customer_address}
          onChange={(e) => onInputChange('customer_address', e.target.value)}
          required
        />
      </div>
    </>
  );
}
