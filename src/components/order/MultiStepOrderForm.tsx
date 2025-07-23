
import React, { useState } from 'react';
import { CustomerSearchStep } from './CustomerSearchStep';
import { OrderTypeSelectionStep } from './OrderTypeSelectionStep';
import { DeliveryMethodSelectionStep } from './DeliveryMethodSelectionStep';
import { PickupLocationStep } from './PickupLocationStep';
import { DeliveryAddressStep } from './DeliveryAddressStep';
import { ProductSelectionStep } from './ProductSelectionStep';
import { DeliveryDetailsStep } from './DeliveryDetailsStep';
import { PaymentMethodStep } from './PaymentMethodStep';
import { OrderReviewStep } from './OrderReviewStep';
import { ProgressIndicator } from './ProgressIndicator';
import { useOrderFormState } from './hooks/useOrderFormState';
import { useOrderActions } from './hooks/useOrderActions';

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const {
    currentStep,
    setCurrentStep,
    formData,
    updateFormData,
    resetForm
  } = useOrderFormState();

  const { createOrder, isCreating } = useOrderActions();

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      // Ensure pickup details are included in the order creation
      const orderData = {
        ...formData,
        // Make sure pickup fields are properly included
        pickup_location_address: formData.pickup_location_address || '',
        pickup_location_name: formData.pickup_location_name || '',
        pickup_contact_name: formData.pickup_contact_name || '',
        pickup_contact_phone: formData.pickup_contact_phone || '',
        pickup_instructions: formData.pickup_instructions || '',
        pickup_date: formData.pickup_date || '',
        pickup_time: formData.pickup_time || ''
      };

      await createOrder(orderData);
      onOrderCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const getStepName = (step: number) => {
    const stepNames = [
      'Customer',
      'Order Type',
      'Delivery Method',
      ...(formData.delivery_method === 'pickup_delivery' ? ['Pickup Location'] : []),
      'Delivery Address',
      'Products',
      'Delivery Details',
      'Payment',
      'Review'
    ];
    return stepNames[step - 1];
  };

  const getTotalSteps = () => {
    return formData.delivery_method === 'pickup_delivery' ? 9 : 8;
  };

  const renderCurrentStep = () => {
    let adjustedStep = currentStep;
    
    // Adjust step numbers for pickup_delivery orders
    if (formData.delivery_method !== 'pickup_delivery' && currentStep > 3) {
      adjustedStep = currentStep + 1;
    }

    switch (adjustedStep) {
      case 1:
        return (
          <CustomerSearchStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <OrderTypeSelectionStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <DeliveryMethodSelectionStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        if (formData.delivery_method === 'pickup_delivery') {
          return (
            <PickupLocationStep
              formData={formData}
              onFormDataChange={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        }
        return (
          <DeliveryAddressStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <DeliveryAddressStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <ProductSelectionStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <DeliveryDetailsStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 8:
        return (
          <PaymentMethodStep
            formData={formData}
            onFormDataChange={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 9:
        return (
          <OrderReviewStep
            formData={formData}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isCreating={isCreating}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator 
        currentStep={currentStep} 
        totalSteps={getTotalSteps()}
        stepName={getStepName(currentStep)}
      />
      
      <div className="min-h-[400px]">
        {renderCurrentStep()}
      </div>
      
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
