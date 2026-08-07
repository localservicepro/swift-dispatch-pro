
import React, { useEffect, useRef } from 'react';
import { OrderAddressForm } from './OrderAddressForm';
import { MapPin } from 'lucide-react';
import { useSuburbManagement } from '@/hooks/useSuburbManagement';

interface OrderDeliveryFormProps {
  formData: {
    full_address: string;
    suburb_id: string;
    delivery_suburb_id?: string;
  };
  deliveryRate: string;
  onFormDataChange: (updates: Partial<OrderDeliveryFormProps['formData']>) => void;
  onSuburbChange: (suburbId: string, suburb?: any) => void;
}

export function OrderDeliveryForm({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange 
}: OrderDeliveryFormProps) {
  const { handleAutoSuburbSelection, suburbsLoading } = useSuburbManagement();
  // Guard so the legacy auto-detect runs at most once per address, and never
  // before the suburb list has loaded (which used to always report "no match").
  const attemptedForAddress = useRef<string | null>(null);

  useEffect(() => {
    if (suburbsLoading) return;
    if (!formData.full_address) return;
    if (formData.delivery_suburb_id) return;
    if (attemptedForAddress.current === formData.full_address) return;

    attemptedForAddress.current = formData.full_address;
    handleAutoSuburbSelection(formData.full_address, handleDeliverySuburbChange);
  }, [formData.full_address, formData.delivery_suburb_id, suburbsLoading]);


  const handleDeliverySuburbChange = (suburbId: string, suburb?: any) => {
    console.log('OrderDeliveryForm - delivery suburb change:', suburbId, suburb);
    // Update delivery suburb specifically and call the main handler
    onFormDataChange({ delivery_suburb_id: suburbId });
    // Also call the suburb change handler for delivery fee calculation
    onSuburbChange(suburbId, suburb);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-green-900">Delivery Address</h3>
      </div>
      
      <OrderAddressForm
        formData={{
          full_address: formData.full_address,
          suburb_id: formData.delivery_suburb_id || '',
        }}
        deliveryRate={deliveryRate}
        onFormDataChange={onFormDataChange}
        onSuburbChange={handleDeliverySuburbChange}
        isDeliveryAddress={true}
      />
    </div>
  );
}
