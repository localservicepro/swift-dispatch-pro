
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";
import { createAddressSelectHandler } from "@/utils/addressUtils";

interface CustomerAddressFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: string;
  onFormDataChange: (updates: Partial<CustomerAddressFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
}

export function CustomerAddressForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: CustomerAddressFormProps) {
  const { handleAutoSuburbSelection } = useSuburbManagement();

  const handleAddressSelect = createAddressSelectHandler(
    onFormDataChange,
    (postcode: string) => handleAutoSuburbSelection(postcode, onSuburbChange)
  );

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

      <div className="text-sm text-gray-500 mt-2">
        <p>📝 Note: Delivery rates shown are estimates only. Final delivery fee will be set during order review.</p>
      </div>
    </>
  );
}
