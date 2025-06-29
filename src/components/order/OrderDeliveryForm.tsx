
import React from 'react';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';
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
      
      <CustomerAddressForm
        formData={{
          full_address: formData.full_address,
          delivery_address: formData.full_address, // Use the same address for both in order context
          suburb_id: formData.suburb_id
        }}
        deliveryRate={deliveryRate}
        onFormDataChange={(updates) => {
          // Map the updates back to the order form structure
          const orderUpdates: Partial<OrderDeliveryFormProps['formData']> = {};
          if (updates.full_address !== undefined) {
            orderUpdates.full_address = updates.full_address;
          }
          if (updates.delivery_address !== undefined) {
            orderUpdates.full_address = updates.delivery_address; // In orders, we use full_address
          }
          if (updates.suburb_id !== undefined) {
            orderUpdates.suburb_id = updates.suburb_id;
          }
          onFormDataChange(orderUpdates);
        }}
        onSuburbChange={onSuburbChange}
      />
    </div>
  );
}
