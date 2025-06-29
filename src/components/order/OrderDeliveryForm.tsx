
import React from 'react';
import { OrderAddressForm } from './OrderAddressForm';
import { MapPin } from 'lucide-react';

interface OrderDeliveryFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: string;
  onFormDataChange: (updates: Partial<OrderDeliveryFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
}

export function OrderDeliveryForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: OrderDeliveryFormProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-green-900">Delivery Address</h3>
      </div>
      
      <OrderAddressForm
        formData={formData}
        deliveryRate={deliveryRate}
        onFormDataChange={onFormDataChange}
        onSuburbChange={onSuburbChange}
      />
    </div>
  );
}
