import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { createSingleOrder, createSplitOrder, SessionExpiredError } from "./services/orderCreationService";
import { useOrderFormState } from "./hooks/useOrderFormState";
import { syncSingleOrderToSheets } from "@/utils/googleSheetsSync";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";


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
    setDeliveryFeeFromSplits,
    handleSuburbChange,
    clearDeliveryAddress,
    resetToCustomerAddress,
    getDeliveryFeeInfo,
    clearOrderDraft,
    nextStep,
    prevStep,
    setCurrentStep,
    setMaxReachedStep,
    goToStep,
    maxReachedStep,
    hasResumedDraft,
    dismissResumedDraft,
    getTotalSteps
  } = useOrderFormState();

  // Reset everything to a blank order, including the persisted draft.
  const startFresh = () => {
    clearOrderDraft();
    setCurrentStep(1);
    setMaxReachedStep(1);
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
    dismissResumedDraft();
  };

  // Calculate total delivery fee from all splits for split orders
  useEffect(() => {
    if (orderType === 'split' && splits.length > 0 && deliveryMethod === 'delivery') {
      const totalDeliveryFee = splits.reduce((sum, split) => {
        return sum + (split.deliveryFee || 0);
      }, 0);
      
      if (totalDeliveryFee !== deliveryFee) {
        setDeliveryFeeFromSplits(totalDeliveryFee);
      }
    }
  }, [splits, orderType, deliveryMethod]);

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
          orderTotals,
          isDeliveryFeeManuallySet,
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

      // Auto-sync new order to the active monthly tab in Google Sheets
      if (result.orderId) {
        syncSingleOrderToSheets(result.orderId).then(r => {
          if (r.success) console.log(`[Google Sheets] Auto sync-single after order creation`);
        });
      } else if (result.orders && result.orders.length > 0) {
        // Split orders: sync each one
        result.orders.forEach((order: any) => {
          syncSingleOrderToSheets(order.id).then(r => {
            if (r.success) console.log(`[Google Sheets] Auto sync-single for split order ${order.id}`);
          });
        });
      }

      toast({
        title: "Success!",
        description: `Order ${result.orderNumber} created successfully`,
      });

      // Clear the draft from sessionStorage
      clearOrderDraft();

      // Call the onOrderCreated callback if provided
      if (onOrderCreated) {
        onOrderCreated();
      }

      // Reset form after successful creation
      setCurrentStep(1);
      setMaxReachedStep(1);
      dismissResumedDraft();
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

      // Detect an expired/missing session — either via our typed error or via
      // the raw RLS / JWT messages that surface when the session dies between
      // form completion and the Create Order click. In all these cases we
      // MUST NOT reset the form: the draft is already saved to sessionStorage
      // and will rehydrate when the user signs back in.
      const msg = (error?.message || '').toLowerCase();
      const isSessionIssue =
        error instanceof SessionExpiredError ||
        msg.includes('row-level security') ||
        msg.includes('row level security') ||
        msg.includes('jwt expired') ||
        msg.includes('jwt') && msg.includes('expired') ||
        error?.status === 401 ||
        error?.status === 403;

      if (isSessionIssue) {
        toast({
          title: "Session expired",
          description:
            "Your sign-in expired before the order could be saved. Your order details are kept — please sign in again and click Create Order.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create order. Please try again.",
          variant: "destructive",
        });
      }
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
            customerTier={selectedCustomer?.customer_type ?? 'residential'}
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
        // Order Type — for BOTH delivery and pickup
        return (
          <OrderTypeSelectionStep
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            onBack={prevStep}
            onNext={nextStep}
          />
        );

      case 5:
        // Logistics — branches by method + type
        if (orderType === "split") {
          return (
            <SplitOrderConfigurationStep
              cart={cart}
              splits={splits}
              customer={selectedCustomer}
              isPickup={deliveryMethod === "pickup"}
              onSplitsChange={setSplits}
              onCartChange={setCart}
              onBack={prevStep}
              onNext={nextStep}
            />
          );
        }
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
        }
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

      case 6:
        // Payment — unified for all paths
        return (
          <PaymentMethodStep
            customer={selectedCustomer!}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onBack={prevStep}
            onNext={nextStep}
          />
        );

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
      {hasResumedDraft && (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground">
            Resumed your saved order draft. You can keep editing or start over.
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismissResumedDraft}>
              Dismiss
            </Button>
            <Button variant="outline" size="sm" onClick={startFresh}>
              Start fresh
            </Button>
          </div>
        </div>
      )}

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
            maxReachedStep={maxReachedStep}
            onStepClick={goToStep}
          />
        </CardContent>
      </Card>

      {renderCurrentStep()}
    </div>
  );
}
