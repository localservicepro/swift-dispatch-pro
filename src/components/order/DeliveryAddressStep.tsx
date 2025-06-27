
import React from 'react';
import { Button } from '@/components/ui/button';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryRate: string; // Changed from number to string
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryAddressStep({ 
  formData, 
  deliveryRate, 
  onFormDataChange, 
  onSuburbChange,
  onBack,
  onNext
}: DeliveryAddressStepProps) {
  const handleContinue = () => {
    if (!formData.full_address || !formData.suburb_id) {
      return; // Don't proceed if required fields are missing
    }
    onNext();
  };

  const isValid = formData.full_address && formData.suburb_id;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Address</h3>
        <CustomerAddressForm
          formData={formData}
          deliveryRate={deliveryRate}
          onFormDataChange={onFormDataChange}
          onSuburbChange={onSuburbChange}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handleContinue}
          disabled={!isValid}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
