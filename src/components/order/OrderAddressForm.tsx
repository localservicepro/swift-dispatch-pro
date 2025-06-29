
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
  onSuburbChange: (suburbId: string) => void;
}

export function OrderAddressForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: OrderAddressFormProps) {
  const { handleAutoSuburbSelection } = useSuburbManagement();

  // Handler specifically for delivery address in orders
  const handleDeliveryAddressSelect = (addressData: any) => {
    console.log('Order delivery address selected:', addressData);
    onFormDataChange({ full_address: addressData.fullAddress });
    
    // Auto-select suburb based on postcode if available
    if (addressData.postcode) {
      handleAutoSuburbSelection(addressData.postcode, onSuburbChange);
    }
  };

  return (
    <>
      <div>
        <EnhancedAddressInput
          label="Delivery Address"
          value={formData.full_address}
          onChange={(value) => onFormDataChange({ full_address: value })}
          onAddressSelect={handleDeliveryAddressSelect}
          placeholder="Start typing delivery address..."
          required
          showMapButton={true}
          showValidation={true}
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the delivery address for this order.
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
