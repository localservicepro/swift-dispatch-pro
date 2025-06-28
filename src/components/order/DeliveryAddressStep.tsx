
import React from 'react';
import { Button } from '@/components/ui/button';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';
import { AddressStatusIndicator } from './AddressStatusIndicator';
import { DeliveryScheduleSection } from './DeliveryScheduleSection';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
  selectedCustomer?: {
    first_name: string;
    last_name: string;
    full_address: string;
  } | null;
  isUsingCustomerAddress?: boolean;
  onClearAddress?: () => void;
  onResetToCustomerAddress?: () => void;
}

export function DeliveryAddressStep({ 
  formData, 
  deliveryDate,
  deliveryTime,
  onFormDataChange, 
  onSuburbChange,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onBack,
  onNext,
  selectedCustomer,
  isUsingCustomerAddress,
  onClearAddress,
  onResetToCustomerAddress
}: DeliveryAddressStepProps) {
  const handleContinue = () => {
    if (!formData.full_address || !formData.suburb_id || !deliveryDate || !deliveryTime) {
      return; // Don't proceed if required fields are missing
    }
    onNext();
  };

  const isValid = formData.full_address && formData.suburb_id && deliveryDate && deliveryTime;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Delivery Address & Schedule</h3>
        </div>

        <AddressStatusIndicator
          selectedCustomer={selectedCustomer}
          isUsingCustomerAddress={isUsingCustomerAddress}
          onClearAddress={onClearAddress}
          onResetToCustomerAddress={onResetToCustomerAddress}
        />

        {/* Delivery Address Section */}
        <div className="space-y-3">
          <div className="border-b pb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Delivery Address</h4>
            <CustomerAddressForm
              formData={formData}
              deliveryRate="" // No longer used for calculations, just reference
              onFormDataChange={onFormDataChange}
              onSuburbChange={onSuburbChange}
            />
          </div>

          <DeliveryScheduleSection
            deliveryDate={deliveryDate}
            deliveryTime={deliveryTime}
            onDeliveryDateChange={onDeliveryDateChange}
            onDeliveryTimeChange={onDeliveryTimeChange}
          />
        </div>
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
