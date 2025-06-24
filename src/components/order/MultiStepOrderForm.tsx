
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { DeliveryMethodSelectionStep } from "./DeliveryMethodSelectionStep";
import { OrderTypeSelectionStep } from "./OrderTypeSelectionStep";
import { DeliveryAddressStep } from "./DeliveryAddressStep";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { OrderReviewStep } from "./OrderReviewStep";
import { SplitOrderConfigurationStep } from "./SplitOrderConfigurationStep";
import { ProgressIndicator } from "./ProgressIndicator";
import { useOrderFormState } from "./hooks/useOrderFormState";
import { createSingleOrder, createSplitOrder } from "./services/orderCreationService";

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  
  const {
    // State
    currentStep,
    selectedCustomer,
    cart,
    adjustments,
    deliveryMethod,
    orderType,
    splits,
    deliveryDate,
    deliveryTime,
    specialInstructions,
    paymentMethod,
    deliveryAddress,
    sameAsBilling,
    useGlobalDeliveryAddress,
    selectedSuburbId,
    deliveryRate,
    subtotal,
    deliveryFee,
    totalAmount,
    orderTotals,
    
    // Setters
    setSelectedCustomer,
    setCart,
    setAdjustments,
    setDeliveryMethod,
    setOrderType,
    setSplits,
    setDeliveryDate,
    setDeliveryTime,
    setSpecialInstructions,
    setPaymentMethod,
    setDeliveryAddress,
    setSameAsBilling,
    setUseGlobalDeliveryAddress,
    handleSuburbChange,
    
    // Navigation
    nextStep,
    prevStep,
    getTotalSteps
  } = useOrderFormState();

  const handleCreateOrder = async () => {
    if (!selectedCustomer) return;
    
    setIsCreating(true);
    try {
      if (orderType === "split") {
        await createSplitOrder({
          customer: selectedCustomer,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          splits,
          paymentMethod,
          specialInstructions,
          orderTotals
        });
      } else {
        await createSingleOrder({
          customer: selectedCustomer,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          deliveryDate,
          deliveryTime,
          specialInstructions,
          paymentMethod,
          deliveryAddress: sameAsBilling ? selectedCustomer.full_address : deliveryAddress,
          sameAsBilling,
          suburbId: selectedSuburbId,
          deliveryRate,
          orderTotals
        });
      }
      
      onOrderCreated();
      onClose();
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const totalSteps = getTotalSteps();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerSearchStep
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
            onNext={nextStep}
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
            onBack={prevStep}
            onNext={nextStep}
          />
        );
      
      case 3:
        return (
          <DeliveryMethodSelectionStep
            deliveryMethod={deliveryMethod}
            onDeliveryMethodChange={setDeliveryMethod}
            onBack={prevStep}
            onNext={nextStep}
          />
        );
      
      case 4:
        if (deliveryMethod === "pickup") {
          return (
            <PaymentMethodStep
              customer={selectedCustomer}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          return (
            <OrderTypeSelectionStep
              orderType={orderType}
              onOrderTypeChange={setOrderType}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }
      
      case 5:
        if (deliveryMethod === "pickup") {
          return (
            <OrderReviewStep
              customer={selectedCustomer!}
              cart={cart}
              subtotal={subtotal}
              adjustments={adjustments}
              deliveryFee={0}
              deliveryMethod={deliveryMethod}
              deliveryDate=""
              deliveryTime=""
              specialInstructions=""
              paymentMethod={paymentMethod}
              deliveryAddress=""
              sameAsBilling={true}
              onBack={prevStep}
              onConfirm={handleCreateOrder}
              isCreating={isCreating}
            />
          );
        } else {
          return (
            <DeliveryAddressStep
              customer={selectedCustomer!}
              orderType={orderType}
              deliveryAddress={deliveryAddress}
              sameAsBilling={sameAsBilling}
              useGlobalDeliveryAddress={useGlobalDeliveryAddress}
              splits={splits}
              selectedSuburbId={selectedSuburbId}
              deliveryRate={deliveryRate}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              specialInstructions={specialInstructions}
              onDeliveryAddressChange={setDeliveryAddress}
              onSameAsBillingChange={setSameAsBilling}
              onUseGlobalDeliveryAddressChange={setUseGlobalDeliveryAddress}
              onSplitsChange={setSplits}
              onSuburbChange={handleSuburbChange}
              onDeliveryDateChange={setDeliveryDate}
              onDeliveryTimeChange={setDeliveryTime}
              onSpecialInstructionsChange={setSpecialInstructions}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }
      
      case 6:
        if (orderType === "split") {
          return (
            <SplitOrderConfigurationStep
              cart={cart}
              splits={splits}
              onSplitsChange={setSplits}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          return (
            <PaymentMethodStep
              customer={selectedCustomer}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }
      
      case 7:
        return (
          <OrderReviewStep
            customer={selectedCustomer!}
            cart={cart}
            subtotal={subtotal}
            adjustments={adjustments}
            deliveryFee={deliveryFee}
            deliveryMethod={deliveryMethod as "delivery" | "pickup"}
            deliveryDate={deliveryDate}
            deliveryTime={deliveryTime}
            specialInstructions={specialInstructions}
            paymentMethod={paymentMethod}
            deliveryAddress={sameAsBilling ? selectedCustomer!.full_address : deliveryAddress}
            sameAsBilling={sameAsBilling}
            onBack={prevStep}
            onConfirm={handleCreateOrder}
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
        totalSteps={totalSteps}
        deliveryMethod={deliveryMethod}
      />
      {renderCurrentStep()}
    </div>
  );
}
