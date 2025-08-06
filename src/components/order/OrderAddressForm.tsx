
import React from 'react';
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";

interface OrderAddressFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: string;
  onFormDataChange: (updates: Partial<OrderAddressFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string, suburb?: any) => void;
  isDeliveryAddress?: boolean;
}

export function OrderAddressForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange,
  isDeliveryAddress = false
}: OrderAddressFormProps) {
  const { handleAutoSuburbSelection } = useSuburbManagement();

  // Handler for address selection
  const handleAddressSelect = (addressData: any) => {
    console.log(`${isDeliveryAddress ? 'Delivery' : 'Order'} address selected:`, addressData);
    onFormDataChange({ full_address: addressData.fullAddress });
    
    // Auto-select suburb based on city and postcode if available
    if (addressData.city || addressData.postcode) {
      handleAutoSuburbSelection(addressData.city || addressData.postcode, onSuburbChange, addressData.postcode);
    }
  };

  const addressLabel = isDeliveryAddress ? "Delivery Address" : "Address";
  const addressNote = isDeliveryAddress 
    ? "This is the specific delivery address for this order."
    : "This is the address for this order.";

  return (
    <>
      <div>
        <EnhancedAddressInput
          label={addressLabel}
          value={formData.full_address}
          onChange={(value) => onFormDataChange({ full_address: value })}
          onAddressSelect={handleAddressSelect}
          placeholder={`Start typing ${addressLabel.toLowerCase()}...`}
          required
          showMapButton={true}
          showValidation={true}
        />
        <p className="text-xs text-gray-500 mt-1">
          {addressNote}
        </p>
      </div>

      <SuburbSelector
        selectedSuburbId={formData.suburb_id}
        onSuburbChange={(suburbId, suburb) => onSuburbChange(suburbId, suburb)}
        label={isDeliveryAddress ? "Delivery Suburb" : "Suburb"}
      />

      <div className="text-sm text-gray-500 mt-2">
        <p>📝 Note: Delivery rates shown are estimates only. Final delivery fee will be set during order review.</p>
      </div>
    </>
  );
}
