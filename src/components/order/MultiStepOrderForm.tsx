
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createSingleOrder, createSplitOrder } from "./services/orderCreationService";
import { useOrderFormState } from "./hooks/useOrderFormState";

export function MultiStepOrderForm() {
  const { toast } = useToast();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

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
    orderNotes,
    deliveryNotes,
    deliveryAddress,
    sameAsBilling,
    useGlobalDeliveryAddress,
    selectedSuburbId,
    manualDeliveryFee,
    subtotal,
    deliveryFee,
    surchargeAmount,
    gstAmount,
    totalAmount,
    orderTotals,
    paymentSettings,
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
    setOrderNotes,
    setDeliveryNotes,
    setDeliveryAddress,
    setSameAsBilling,
    setUseGlobalDeliveryAddress,
    setSelectedSuburbId,
    setManualDeliveryFee,
    handleSuburbChange,
    nextStep,
    prevStep,
    setCurrentStep,
    getTotalSteps
  } = useOrderFormState();

  const handleOrderCreation = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one product to the cart",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOrder(true);

    try {
      let result;

      if (orderType === "single") {
        result = await createSingleOrder({
          customer: selectedCustomer,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          deliveryDate,
          deliveryTime,
          specialInstructions,
          paymentMethod,
          orderNotes,
          deliveryNotes,
          deliveryAddress,
          sameAsBilling,
          suburbId: selectedSuburbId,
          orderTotals
        });
      } else {
        result = await createSplitOrder({
          customer: selectedCustomer,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          splits,
          paymentMethod,
          specialInstructions,
          orderNotes,
          deliveryNotes,
          orderTotals
        });
      }

      toast({
        title: "Success!",
        description: `Order ${result.orderNumber} created successfully`,
      });

      // Reset form after successful creation
      setCurrentStep(1);
      setSelectedCustomer(null);
      setCart([]);
      setAdjustments(0);
      setDeliveryMethod("delivery");
      setOrderType("single");
      setSplits([]);
      setDeliveryDate("");
      setDeliveryTime("");
      setSpecialInstructions("");
      setPaymentMethod("");
      setOrderNotes("");
      setDeliveryNotes("");
      setDeliveryAddress("");
      setSameAsBilling(true);
      setUseGlobalDeliveryAddress(true);
      setSelectedSuburbId("");
      setManualDeliveryFee(0);

    } catch (error: any) {
      console.error('Order creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

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
            adjustments={adjustments}
            onCartUpdate={setCart}
            onAdjustmentsUpdate={setAdjustments}
            onBack={prevStep}
            onNext={nextStep}
            customer={selectedCustomer}
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
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={prevStep}
              onNext={nextStep}
              subtotal={subtotal}
              adjustments={adjustments}
              deliveryFee={deliveryFee}
              deliveryMethod="pickup"
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
              deliveryFee={deliveryFee}
              deliveryMethod="pickup"
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              specialInstructions={specialInstructions}
              paymentMethod={paymentMethod}
              orderNotes={orderNotes}
              deliveryNotes={deliveryNotes}
              deliveryAddress={deliveryAddress}
              sameAsBilling={sameAsBilling}
              onBack={prevStep}
              onConfirm={handleOrderCreation}
              isCreating={isCreatingOrder}
              onDeliveryFeeChange={setManualDeliveryFee}
              onOrderNotesChange={setOrderNotes}
              onDeliveryNotesChange={setDeliveryNotes}
            />
          );
        } else if (orderType === "split") {
          return (
            <SplitOrderConfigurationStep
              customer={selectedCustomer!}
              cart={cart}
              splits={splits}
              onSplitsUpdate={setSplits}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          return (
            <DeliveryAddressStep
              customer={selectedCustomer!}
              deliveryAddress={deliveryAddress}
              sameAsBilling={sameAsBilling}
              useGlobalDeliveryAddress={useGlobalDeliveryAddress}
              selectedSuburbId={selectedSuburbId}
              manualDeliveryFee={manualDeliveryFee}
              onDeliveryAddressUpdate={setDeliveryAddress}
              onSameAsBillingUpdate={setSameAsBilling}
              onUseGlobalDeliveryAddressUpdate={setUseGlobalDeliveryAddress}
              onSuburbUpdate={handleSuburbChange}
              onManualDeliveryFeeUpdate={setManualDeliveryFee}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }

      case 6:
        return (
          <PaymentMethodStep
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onBack={prevStep}
            onNext={nextStep}
            subtotal={subtotal}
            adjustments={adjustments}
            deliveryFee={deliveryFee}
            deliveryMethod={deliveryMethod as "delivery" | "pickup"}
          />
        );

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
            orderNotes={orderNotes}
            deliveryNotes={deliveryNotes}
            deliveryAddress={deliveryAddress}
            sameAsBilling={sameAsBilling}
            onBack={prevStep}
            onConfirm={handleOrderCreation}
            isCreating={isCreatingOrder}
            onDeliveryFeeChange={setManualDeliveryFee}
            onOrderNotesChange={setOrderNotes}
            onDeliveryNotesChange={setDeliveryNotes}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Order</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={getTotalSteps()}
            deliveryMethod={deliveryMethod}
          />
        </CardContent>
      </Card>

      {renderCurrentStep()}
    </div>
  );
}
