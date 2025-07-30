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
import { createOrder, CreateOrderData } from './services/orderCreationService';

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
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
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

  const handleCreateOrder = async () => {
    if (!selectedCustomer || !paymentSettings) return;
    
    setIsCreatingOrder(true);
    
    try {
      // Calculate final totals
      const finalTotals = calculateOrderTotals(subtotal, adjustments, deliveryFee, paymentMethod, paymentSettings);
      
      // Map form data to CreateOrderData interface
      const orderData: CreateOrderData = {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.company_name || selectedCustomer.business_name || 
                     `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim(),
        customer_phone: selectedCustomer.phone || undefined,
        customer_address: selectedCustomer.full_address,
        delivery_address: deliveryMethod === "delivery" ? deliveryAddress : selectedCustomer.full_address,
        products: cart.map(item => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })),
        total_amount: finalTotals.totalAmount,
        subtotal: finalTotals.subtotal,
        delivery_fee: finalTotals.deliveryFee,
        adjustments: finalTotals.adjustments,
        payment_method: paymentMethod,
        delivery_date: deliveryMethod === "delivery" ? deliveryDate : undefined,
        delivery_time: deliveryMethod === "delivery" ? deliveryTime : undefined,
        special_instructions: [orderNotes, deliveryNotes].filter(Boolean).join('; ') || undefined,
        purchase_order: purchaseOrder || undefined,
        contact_id: selectedContact?.id || undefined,
        contact_name: selectedContact?.name || undefined,
        contact_email: selectedContact?.email || undefined,
        contact_phone: selectedContact?.phone || undefined,
        delivery_method: deliveryMethod as "delivery" | "pickup"
      };
      
      console.log("Creating order with data:", orderData);
      
      await createOrder(orderData);
      onOrderCreated();
    } catch (error) {
      console.error('Failed to create order:', error);
      // Error toast is handled by createOrder service
    } finally {
      setIsCreatingOrder(false);
    }
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
        // For delivery method, show address step. For pickup, go to payment.
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
          // For pickup, show payment step
          return (
            <PaymentMethodStep
              customer={selectedCustomer!}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={handleBack}
              onNext={handleNext}
            />
          );
        }
      
      case 5:
        // Payment step for delivery orders or Review step for pickup orders
        if (deliveryMethod === "delivery") {
          return (
            <PaymentMethodStep
              customer={selectedCustomer!}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={handleBack}
              onNext={handleNext}
            />
          );
        } else {
          // Review step for pickup orders
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
              onConfirm={handleCreateOrder}
              isCreating={isCreatingOrder}
              onDeliveryFeeChange={() => {}}
              onOrderNotesChange={setOrderNotes}
              onDeliveryNotesChange={() => {}}
              onPurchaseOrderChange={setPurchaseOrder}
              isDeliveryFeeManuallySet={false}
              deliveryFeeInfo={null}
            />
          );
        }

      case 6:
        // Review step for delivery orders only
        return (
          <OrderReviewStep
            customer={selectedCustomer!}
            selectedContact={selectedContact}
            cart={cart}
            subtotal={subtotal}
            adjustments={adjustments}
            deliveryFee={deliveryFee}
            deliveryMethod={deliveryMethod as "delivery" | "pickup"}
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
            onConfirm={handleCreateOrder}
            isCreating={isCreatingOrder}
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
          // For pickup, step 4 is payment method
          return paymentMethod !== "";
        }
      case 5:
        if (deliveryMethod === "delivery") {
          // Payment step for delivery orders
          return paymentMethod !== "";
        } else {
          // Review step for pickup orders - always can proceed
          return true;
        }
      case 6:
        // Review step for delivery orders - always can proceed
        return true;
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