
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";

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
    
    // Auto-select suburb based on postcode if available
    if (addressData.postcode) {
      // You could implement auto-suburb selection here based on postcode
      console.log('Could auto-select suburb for postcode:', addressData.postcode);
    }
  };

  return (
    <>
      <div>
        <EnhancedAddressInput
          label="Full Address"
          value={formData.full_address}
          onChange={(value) => onFormDataChange({ full_address: value })}
          onAddressSelect={handleAddressSelect}
          placeholder="Start typing your address..."
          required
          showMapButton={true}
          showValidation={true}
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
