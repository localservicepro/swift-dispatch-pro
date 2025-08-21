
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";

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

  // Handler for office address change with auto-population logic
  const handleOfficeAddressChange = (value: string) => {
    const updates: any = { full_address: value };
    
    // Auto-populate delivery address if it's empty or same as previous office address
    if (!formData.delivery_address || formData.delivery_address === formData.full_address) {
      updates.delivery_address = value;
    }
    
    onFormDataChange(updates);
  };

  // Specific handler for delivery address that only updates delivery_address
  const handleDeliveryAddressSelect = (addressData: any) => {
    console.log('Delivery address selected:', addressData);
    onFormDataChange({ delivery_address: addressData.fullAddress });
    
    // Auto-select suburb based on full address
    if (addressData.fullAddress) {
      handleAutoSuburbSelection(addressData.fullAddress, onSuburbChange);
    }
  };

  // Check if delivery address matches office address
  const isDeliveryAddressSynced = formData.delivery_address === formData.full_address;

  return (
    <>
      <div>
        <Label htmlFor="full_address">Office/Business Address</Label>
        <Input
          id="full_address"
          value={formData.full_address}
          onChange={(e) => handleOfficeAddressChange(e.target.value)}
          placeholder="Enter office or business address..."
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          This is your office/business address for billing and contact purposes.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Delivery Address</Label>
          {!isDeliveryAddressSynced && formData.full_address && (
            <button
              type="button"
              onClick={() => onFormDataChange({ delivery_address: formData.full_address })}
              className="text-xs text-primary hover:text-primary/80 underline"
            >
              Use office address
            </button>
          )}
        </div>
        <EnhancedAddressInput
          value={formData.delivery_address}
          onChange={(value) => onFormDataChange({ delivery_address: value })}
          onAddressSelect={handleDeliveryAddressSelect}
          placeholder={formData.full_address ? "Same as office address" : "Start typing delivery address..."}
          required
          showMapButton={true}
          showValidation={true}
        />
        {isDeliveryAddressSynced && formData.full_address && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            📍 Using office address for delivery
          </p>
        )}
        {!isDeliveryAddressSynced && (
          <p className="text-xs text-gray-500 mt-1">
            This is the primary delivery address for your orders.
          </p>
        )}
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
