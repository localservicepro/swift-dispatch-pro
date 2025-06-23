
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { GoogleAddressAutocomplete } from "@/components/ui/google-address-autocomplete";

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
  const handleAddressSelect = (addressData: any) => {
    console.log('Address selected:', addressData);
    onFormDataChange({ full_address: addressData.fullAddress });
    // You could also auto-select suburb based on postcode here
  };

  return (
    <>
      <div>
        <GoogleAddressAutocomplete
          label="Full Address"
          value={formData.full_address}
          onChange={(value) => onFormDataChange({ full_address: value })}
          onAddressSelect={handleAddressSelect}
          placeholder="Start typing your address..."
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
