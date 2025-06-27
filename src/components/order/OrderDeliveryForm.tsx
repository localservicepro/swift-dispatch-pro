
import React from 'react';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';

interface OrderDeliveryFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: number;
  onFormDataChange: (updates: Partial<OrderDeliveryFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string, rate: number) => void;
}

export function OrderDeliveryForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: OrderDeliveryFormProps) {
  return (
    <div className="space-y-4">
      <CustomerAddressForm
        formData={formData}
        deliveryRate={deliveryRate}
        onFormDataChange={onFormDataChange}
        onSuburbChange={onSuburbChange}
      />
    </div>
  );
}
