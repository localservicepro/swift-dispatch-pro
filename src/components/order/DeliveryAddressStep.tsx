
import React from 'react';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: number;
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string, rate: number) => void;
}

export function DeliveryAddressStep({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: DeliveryAddressStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Delivery Address</h3>
      <CustomerAddressForm
        formData={formData}
        deliveryRate={deliveryRate}
        onFormDataChange={onFormDataChange}
        onSuburbChange={onSuburbChange}
      />
    </div>
  );
}
