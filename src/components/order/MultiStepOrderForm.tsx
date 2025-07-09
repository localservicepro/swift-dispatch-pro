
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ContactSelectionStep } from "./ContactSelectionStep";
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
    handleSuburbChange,
    clearDeliveryAddress,
    resetToCustomerAddress,
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
          purchaseOrder,
          deliveryAddress,
          sameAsBilling,
          suburbId: selectedSuburbId,
          orderTotals,
          selectedContact
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
          purchaseOrder,
          orderTotals,
          selectedContact
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
          <CustomerSearchStep
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
            onNext={nextStep}
          />
        );

      case 2:
        // Check if we need contact selection for companies with multiple contacts
        if (selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name)) {
          return (
            <ContactSelectionStep
              customer={selectedCustomer}
              selectedContact={selectedContact}
              onContactSelect={setSelectedContact}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
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
        }

      case 3:
        // This is now ProductSelectionStep if contact selection was shown
        if (selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name)) {
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
        } else {
          // If no contact selection, this is delivery method step
          return (
            <DeliveryMethodSelectionStep
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }

      case 4:
        // This is DeliveryMethodSelectionStep if contact selection was shown
        if (selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name)) {
          return (
            <DeliveryMethodSelectionStep
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        } else {
          // If no contact selection, this logic shifts down
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
        }

      case 5:
        // Handle different flows based on contact selection
        const hasContactSelection = selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name);
        
        if (hasContactSelection) {
          // With contact selection: Customer → Contact → Products → Method → ...
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
        } else {
          // Without contact selection: Customer → Products → Method → Type/Payment → ...
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
                onSuburbChange={handleSuburbChange}
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
        }

      case 6:
        const hasContactSelectionCase6 = selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name);
        
        if (hasContactSelectionCase6) {
          // With contact selection flow
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
                onSuburbChange={handleSuburbChange}
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
        } else {
          // Without contact selection, this is payment method step
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
        const hasContactSelectionCase7 = selectedCustomer && (selectedCustomer.company_name || selectedCustomer.business_name);
        
        if (hasContactSelectionCase7) {
          // With contact selection, this is payment method step
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
          // Without contact selection, this is final review step
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
        }

      case 8:
        // Final review step when contact selection was shown
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
