import React, { useState } from 'react';
import { CustomerSearchStep } from './CustomerSearchStep';
import { ProductSelectionStep } from './ProductSelectionStep';
import { DeliveryMethodSelectionStep } from './DeliveryMethodSelectionStep';
import { PaymentMethodStep } from './PaymentMethodStep';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Customer, SelectedContact, CartItem } from './types';
import { useToast } from '@/hooks/use-toast';

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [adjustments, setAdjustments] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "pickup_delivery" | "">("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const { toast } = useToast();

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateOrder = () => {
    // Simplified order creation for now
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
    onOrderCreated();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerSearchStep
            selectedCustomer={selectedCustomer}
            selectedContact={selectedContact}
            onCustomerSelect={setSelectedCustomer}
            onContactSelect={setSelectedContact}
            onNext={handleNext}
          />
        );
      
      case 2:
        return (
          <ProductSelectionStep
            cart={cart}
            subtotal={subtotal}
            adjustments={adjustments}
            onCartUpdate={setCart}
            onAdjustmentsChange={setAdjustments}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      
      case 3:
        return (
          <DeliveryMethodSelectionStep
            deliveryMethod={deliveryMethod}
            onDeliveryMethodChange={setDeliveryMethod}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      
      case 4:
        return (
          <PaymentMethodStep
            customer={selectedCustomer!}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      
      default:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Review Order</h3>
            <p>Customer: {selectedCustomer?.first_name} {selectedCustomer?.last_name}</p>
            <p>Items: {cart.length}</p>
            <p>Total: ${subtotal.toFixed(2)}</p>
            <p>Delivery Method: {deliveryMethod}</p>
            <p>Payment Method: {paymentMethod}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleCreateOrder}>
                Create Order
              </Button>
            </div>
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedCustomer !== null;
      case 2:
        return cart.length > 0;
      case 3:
        return deliveryMethod !== "";
      case 4:
        return paymentMethod !== "";
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Simple Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step}
          </div>
        ))}
      </div>
      
      <Card>
        <CardContent className="p-6">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of 5
        </div>
      </div>
    </div>
  );
}