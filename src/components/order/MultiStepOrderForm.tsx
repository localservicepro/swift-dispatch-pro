
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { DeliveryMethodSelectionStep } from "./DeliveryMethodSelectionStep";
import { PickupSchedulingStep } from "./PickupSchedulingStep";
import { OrderTypeSelectionStep } from "./OrderTypeSelectionStep";
import { DeliveryAddressStep } from "./DeliveryAddressStep";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { OrderReviewStep } from "./OrderReviewStep";
import { SplitOrderConfigurationStep } from "./SplitOrderConfigurationStep";
import { ProgressIndicator } from "./ProgressIndicator";
import { OrderCustomerHeader } from "./OrderCustomerHeader";
import { createSingleOrder, createSplitOrder } from "./services/orderCreationService";
import { useOrderFormState } from "./hooks/useOrderFormState";

interface MultiStepOrderFormProps {
  onOrderCreated?: () => void;
  onClose?: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const { toast } = useToast();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const {
    currentStep,
    selectedCustomer,
    selectedContact,
    cart,
    adjustments,
    deliveryMethod,
    orderType,
    splits,
    deliveryDate,
    deliveryTime,
    pickupTiming,
    specialInstructions,
    paymentMethod,
    orderNotes,
    deliveryNotes,
    purchaseOrder,
    deliveryAddress,
    sameAsBilling,
    useGlobalDeliveryAddress,
    selectedSuburbId,
    manualDeliveryFee,
    isUsingCustomerAddress,
    subtotal,
    deliveryFee,
    surchargeAmount,
    gstAmount,
    totalAmount,
    orderTotals,
    paymentSettings,
    setSelectedCustomer,
    setSelectedContact,
    setCart,
    setAdjustments,
    setDeliveryMethod,
    setOrderType,
    setSplits,
    setDeliveryDate,
    setDeliveryTime,
    setPickupTiming,
    setSpecialInstructions,
    setPaymentMethod,
    setOrderNotes,
    setDeliveryNotes,
    setPurchaseOrder,
    setDeliveryAddress,
    setSameAsBilling,
    setUseGlobalDeliveryAddress,
    setSelectedSuburbId,
    setManualDeliveryFee,
    isDeliveryFeeManuallySet,
    handleSuburbChange,
    clearDeliveryAddress,
    resetToCustomerAddress,
    getDeliveryFeeInfo,
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
          selectedContact,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          deliveryDate,
          deliveryTime,
          pickupTiming,
          specialInstructions,
          paymentMethod,
          orderNotes,
          deliveryNotes,
          purchaseOrder,
          deliveryAddress,
          sameAsBilling,
          suburbId: selectedSuburbId,
          orderTotals
        });
      } else {
        result = await createSplitOrder({
          customer: selectedCustomer,
          selectedContact,
          cart,
          adjustments,
          deliveryMethod: deliveryMethod as "delivery" | "pickup",
          pickupTiming,
          splits,
          paymentMethod,
          specialInstructions,
          orderNotes,
          deliveryNotes,
          purchaseOrder,
          orderTotals
        });
      }

      toast({
        title: "Success!",
        description: `Order ${result.orderNumber} created successfully`,
      });

      // Call the onOrderCreated callback if provided
      if (onOrderCreated) {
        onOrderCreated();
      }

      // Reset form after successful creation
      setCurrentStep(1);
      setSelectedCustomer(null);
      setSelectedContact(null);
      setCart([]);
      setAdjustments(0);
      setDeliveryMethod("delivery");
      setOrderType("single");
      setSplits([]);
      setDeliveryDate("");
      setDeliveryTime("");
      setPickupTiming("scheduled");
      setSpecialInstructions("");
      setPaymentMethod("");
      setOrderNotes("");
      setDeliveryNotes("");
      setPurchaseOrder("");
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
          <ErrorBoundary fallbackTitle="Customer Search Error" showRefresh={false}>
            <CustomerSearchStep
              selectedCustomer={selectedCustomer}
              selectedContact={selectedContact}
              onCustomerSelect={setSelectedCustomer}
              onContactSelect={setSelectedContact}
              onNext={nextStep}
            />
          </ErrorBoundary>
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
            <PickupSchedulingStep
              pickupDate={deliveryDate}
              pickupTime={deliveryTime}
              pickupTiming={pickupTiming}
              onPickupDateChange={setDeliveryDate}
              onPickupTimeChange={setDeliveryTime}
              onPickupTimingChange={setPickupTiming}
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
            <PaymentMethodStep
              customer={selectedCustomer!}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else if (orderType === "split") {
          return (
            <SplitOrderConfigurationStep
              cart={cart}
              splits={splits}
              onSplitsChange={setSplits}
              onCartChange={setCart}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          return (
            <DeliveryAddressStep
              formData={{
                full_address: deliveryAddress,
                suburb_id: selectedSuburbId
              }}
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              onFormDataChange={(updates) => {
                if (updates.full_address !== undefined) {
                  setDeliveryAddress(updates.full_address);
                }
                if (updates.suburb_id !== undefined) {
                  setSelectedSuburbId(updates.suburb_id);
                }
              }}
              onSuburbChange={(suburbId, suburb) => handleSuburbChange(suburbId, suburb)}
              onDeliveryDateChange={setDeliveryDate}
              onDeliveryTimeChange={setDeliveryTime}
              onBack={prevStep}
              onNext={nextStep}
              selectedCustomer={selectedCustomer}
              isUsingCustomerAddress={isUsingCustomerAddress}
              onClearAddress={clearDeliveryAddress}
              onResetToCustomerAddress={resetToCustomerAddress}
            />
          );
        }

      case 6:
        if (deliveryMethod === "pickup") {
          return (
            <OrderReviewStep
              customer={selectedCustomer!}
              selectedContact={selectedContact}
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
              purchaseOrder={purchaseOrder}
              deliveryAddress={deliveryAddress}
              sameAsBilling={sameAsBilling}
              onBack={prevStep}
              onConfirm={handleOrderCreation}
              isCreating={isCreatingOrder}
              onDeliveryFeeChange={setManualDeliveryFee}
              onOrderNotesChange={setOrderNotes}
              onDeliveryNotesChange={setDeliveryNotes}
              onPurchaseOrderChange={setPurchaseOrder}
            />
          );
        } else if (orderType === "split") {
          return (
            <PaymentMethodStep
              customer={selectedCustomer!}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          return (
            <PaymentMethodStep
              customer={selectedCustomer!}
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
            selectedContact={selectedContact}
            cart={cart}
            splits={splits}
            orderType={orderType}
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
            purchaseOrder={purchaseOrder}
            deliveryAddress={deliveryAddress}
            sameAsBilling={sameAsBilling}
            onBack={prevStep}
            onConfirm={handleOrderCreation}
            isCreating={isCreatingOrder}
            onDeliveryFeeChange={setManualDeliveryFee}
            onOrderNotesChange={setOrderNotes}
            onDeliveryNotesChange={setDeliveryNotes}
            onPurchaseOrderChange={setPurchaseOrder}
            isDeliveryFeeManuallySet={isDeliveryFeeManuallySet}
            deliveryFeeInfo={getDeliveryFeeInfo()}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {selectedCustomer && (
        <OrderCustomerHeader 
          customer={selectedCustomer}
          contact={selectedContact}
          onChangeCustomer={() => setCurrentStep(1)}
        />
      )}
      
      <Card>
        <CardContent className="pt-6">
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
