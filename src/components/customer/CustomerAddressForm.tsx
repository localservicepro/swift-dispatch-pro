
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuburbSelector } from "@/components/order/SuburbSelector";

interface CustomerAddressFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: number;
  onFormDataChange: (updates: Partial<CustomerAddressFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string, rate: number) => void;
}

export function CustomerAddressForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: CustomerAddressFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="full_address">Full Address</Label>
        <Input
          id="full_address"
          value={formData.full_address}
          onChange={(e) => onFormDataChange({ full_address: e.target.value })}
          required
        />
      </div>

      <SuburbSelector
        selectedSuburbId={formData.suburb_id}
        onSuburbChange={onSuburbChange}
      />

      {deliveryRate > 0 && (
        <div className="text-sm text-gray-600">
          Delivery Rate: ${deliveryRate.toFixed(2)}
        </div>
      )}
    </>
  );
}
