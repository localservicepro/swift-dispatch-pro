
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";
import { createAddressSelectHandler } from "@/utils/addressUtils";

interface CustomerAddressFormProps {
  formData: {
    full_address: string;
    delivery_address: string;
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

  const handleDeliveryAddressSelect = createAddressSelectHandler(
    (updates) => onFormDataChange({ delivery_address: updates.full_address }),
    (postcode: string) => handleAutoSuburbSelection(postcode, onSuburbChange)
  );

  return (
    <>
      <div>
        <Label htmlFor="full_address">Office/Business Address</Label>
        <Input
          id="full_address"
          value={formData.full_address}
          onChange={(e) => onFormDataChange({ full_address: e.target.value })}
          placeholder="Enter office or business address..."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This is your office/business address for billing and contact purposes.
        </p>
      </div>

      <div>
        <EnhancedAddressInput
          label="Delivery Address"
          value={formData.delivery_address}
          onChange={(value) => onFormDataChange({ delivery_address: value })}
          onAddressSelect={handleDeliveryAddressSelect}
          placeholder="Start typing delivery address..."
          required
          showMapButton={true}
          showValidation={true}
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the primary delivery address for your orders.
        </p>
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
