import React, { useState, useMemo, useEffect } from 'react';
import { CustomerSearchStep } from './CustomerSearchStep';
import { ProductSelectionStep } from './ProductSelectionStep';
import { DeliveryMethodSelectionStep } from './DeliveryMethodSelectionStep';
import { DeliveryAddressStep } from './DeliveryAddressStep';
import { OrderReviewStep } from './OrderReviewStep';
import { PaymentMethodStep } from './PaymentMethodStep';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Customer, SelectedContact, CartItem } from './types';
import { useToast } from '@/hooks/use-toast';
import { useSuburbManagement } from '@/hooks/useSuburbManagement';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { calculateOrderTotals } from './utils/paymentCalculations';

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
  // Calculate subtotal dynamically based on cart items
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  }, [cart]);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "">("");
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliverySuburbId, setDeliverySuburbId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [isUsingCustomerAddress, setIsUsingCustomerAddress] = useState(true);
  
  // Review step state
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isDeliveryFeeManuallySet, setIsDeliveryFeeManuallySet] = useState(false);
  
  const { toast } = useToast();
  const { handleAutoSuburbSelection, suburbs } = useSuburbManagement();
  const { data: paymentSettings } = usePaymentSettings();

  // Auto-populate delivery address when customer is selected
  useEffect(() => {
    if (selectedCustomer && isUsingCustomerAddress) {
      setDeliveryAddress(selectedCustomer.full_address);
      setDeliverySuburbId(selectedCustomer.suburb_id);
    }
  }, [selectedCustomer, isUsingCustomerAddress]);

  const getTotalSteps = () => {
    return deliveryMethod === "delivery" ? 6 : 5;
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleDeliveryMethodChange = (method: "delivery" | "pickup") => {
    setDeliveryMethod(method);
    // Reset delivery data when changing methods
    if (method === "pickup") {
      setDeliveryAddress("");
      setDeliverySuburbId("");
      setDeliveryDate("");
      setDeliveryTime("");
    } else if (method === "delivery" && selectedCustomer) {
      // Auto-populate with customer address for delivery
      setDeliveryAddress(selectedCustomer.full_address);
      setDeliverySuburbId(selectedCustomer.suburb_id);
      setIsUsingCustomerAddress(true);
    }
  };

  const handleAddressFormChange = (updates: { full_address?: string; suburb_id?: string }) => {
    if (updates.full_address !== undefined) {
      setDeliveryAddress(updates.full_address);
      setIsUsingCustomerAddress(false);
    }
    if (updates.suburb_id !== undefined) {
      setDeliverySuburbId(updates.suburb_id);
    }
  };

  const handleSuburbChange = (suburbId: string, suburb?: any) => {
    setDeliverySuburbId(suburbId);
    setIsUsingCustomerAddress(false);
    
    // Auto-apply delivery fee from suburb
    if (suburb && suburb.delivery_rate && !isDeliveryFeeManuallySet) {
      const rate = parseFloat(suburb.delivery_rate) || 0;
      setDeliveryFee(rate);
    }
  };

  const clearDeliveryAddress = () => {
    setDeliveryAddress("");
    setDeliverySuburbId("");
    setIsUsingCustomerAddress(false);
  };

  const resetToCustomerAddress = () => {
    if (selectedCustomer) {
      setDeliveryAddress(selectedCustomer.full_address);
      setDeliverySuburbId(selectedCustomer.suburb_id);
      setIsUsingCustomerAddress(true);
    }
  };

  const handleCreateOrder = () => {
    // Include all order data including review step fields
    const orderData = {
      customer: selectedCustomer,
      contact: selectedContact,
      cart,
      adjustments,
      deliveryMethod,
      deliveryAddress: deliveryMethod === "delivery" ? deliveryAddress : null,
      deliverySuburbId: deliveryMethod === "delivery" ? deliverySuburbId : null,
      deliveryDate: deliveryMethod === "delivery" ? deliveryDate : null,
      deliveryTime: deliveryMethod === "delivery" ? deliveryTime : null,
      paymentMethod,
      purchaseOrder,
      orderNotes,
      deliveryNotes,
      deliveryFee: deliveryMethod === "delivery" ? deliveryFee : 0
    };
    
    console.log("Creating order with data:", orderData);
    
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
    onOrderCreated();
  };

  // Calculate order totals for review step
  const orderTotals = useMemo(() => {
    if (!paymentSettings) return null;
    return calculateOrderTotals(subtotal, adjustments, deliveryFee, paymentMethod, paymentSettings);
  }, [subtotal, adjustments, deliveryFee, paymentMethod, paymentSettings]);

  // Get delivery fee info for display
  const deliveryFeeInfo = useMemo(() => {
    if (!deliverySuburbId || suburbs.length === 0) return null;
    const suburb = suburbs.find(s => s.id === deliverySuburbId);
    if (!suburb) return null;
    
    return {
      suburbName: suburb.name,
      displayText: `${suburb.name} - AU$${suburb.delivery_rate}`
    };
  }, [deliverySuburbId, suburbs]);

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
            onDeliveryMethodChange={handleDeliveryMethodChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      
      case 4:
        // For delivery method, show address step. For pickup, go to review.
        if (deliveryMethod === "delivery") {
          return (
            <DeliveryAddressStep
              formData={{
                full_address: deliveryAddress,
                suburb_id: deliverySuburbId
              }}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              onFormDataChange={handleAddressFormChange}
              onSuburbChange={handleSuburbChange}
              onDeliveryDateChange={setDeliveryDate}
              onDeliveryTimeChange={setDeliveryTime}
              onBack={handleBack}
              onNext={handleNext}
              selectedCustomer={selectedCustomer}
              isUsingCustomerAddress={isUsingCustomerAddress}
              onClearAddress={clearDeliveryAddress}
              onResetToCustomerAddress={resetToCustomerAddress}
            />
          );
        } else {
          // For pickup, show review step
          return (
            <OrderReviewStep
              customer={selectedCustomer!}
              selectedContact={selectedContact}
              cart={cart}
              subtotal={subtotal}
              adjustments={adjustments}
              deliveryFee={0}
              deliveryMethod="pickup"
              deliveryDate=""
              deliveryTime=""
              specialInstructions=""
              paymentMethod={paymentMethod}
              orderNotes={orderNotes}
              deliveryNotes=""
              purchaseOrder={purchaseOrder}
              deliveryAddress=""
              sameAsBilling={true}
              onBack={handleBack}
              onConfirm={handleNext}
              isCreating={false}
              onDeliveryFeeChange={() => {}}
              onOrderNotesChange={setOrderNotes}
              onDeliveryNotesChange={() => {}}
              onPurchaseOrderChange={setPurchaseOrder}
              isDeliveryFeeManuallySet={false}
              deliveryFeeInfo={null}
            />
          );
        }
      
      case 5:
        // Review step for delivery orders or Payment step for pickup orders
        if (deliveryMethod === "delivery") {
          return (
            <OrderReviewStep
              customer={selectedCustomer!}
              selectedContact={selectedContact}
              cart={cart}
              subtotal={subtotal}
              adjustments={adjustments}
              deliveryFee={deliveryFee}
              deliveryMethod={deliveryMethod}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              specialInstructions=""
              paymentMethod={paymentMethod}
              orderNotes={orderNotes}
              deliveryNotes={deliveryNotes}
              purchaseOrder={purchaseOrder}
              deliveryAddress={deliveryAddress}
              sameAsBilling={isUsingCustomerAddress}
              onBack={handleBack}
              onConfirm={handleNext}
              isCreating={false}
              onDeliveryFeeChange={(fee) => {
                setDeliveryFee(fee);
                setIsDeliveryFeeManuallySet(true);
              }}
              onOrderNotesChange={setOrderNotes}
              onDeliveryNotesChange={setDeliveryNotes}
              onPurchaseOrderChange={setPurchaseOrder}
              isDeliveryFeeManuallySet={isDeliveryFeeManuallySet}
              deliveryFeeInfo={deliveryFeeInfo}
            />
          );
        } else {
          // Payment step for pickup orders
          return (
            <PaymentMethodStep
              customer={selectedCustomer!}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onCreateOrder={handleCreateOrder}
              onBack={handleBack}
            />
          );
        }

      case 6:
        // Payment step for delivery orders only
        return (
          <PaymentMethodStep
            customer={selectedCustomer!}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onCreateOrder={handleCreateOrder}
            onBack={handleBack}
          />
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
        if (deliveryMethod === "delivery") {
          // For delivery, step 4 is address confirmation
          return deliveryAddress && deliverySuburbId && deliveryDate && deliveryTime;
        } else {
          // For pickup, step 4 is review - always can proceed
          return true;
        }
      case 5:
        if (deliveryMethod === "delivery") {
          // Review step for delivery orders - always can proceed
          return true;
        } else {
          // Payment step for pickup orders
          return paymentMethod !== "";
        }
      case 6:
        // Payment step for delivery orders
        return paymentMethod !== "";
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((step) => (
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
          Step {currentStep} of {getTotalSteps()}
        </div>
      </div>
    </div>
  );
}