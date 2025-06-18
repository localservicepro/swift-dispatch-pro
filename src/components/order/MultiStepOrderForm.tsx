
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { DeliveryMethodSelectionStep } from "./DeliveryMethodSelectionStep";
import { OrderTypeSelectionStep } from "./OrderTypeSelectionStep";
import { DeliveryAddressStep } from "./DeliveryAddressStep";
import { SplitOrderConfigurationStep } from "./SplitOrderConfigurationStep";
import { DeliveryDetailsStep } from "./DeliveryDetailsStep";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { OrderReviewStep } from "./OrderReviewStep";
import { ProgressIndicator } from "./ProgressIndicator";
import { useOrderFormState } from "./hooks/useOrderFormState";
import { useDriverManager } from "./hooks/useDriverManager";
import { createOrder } from "./services/orderCreationService";
import { Truck } from "./types";

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const {
    currentStep,
    selectedCustomer,
    cart,
    adjustments,
    deliveryMethod,
    orderType,
    splits,
    deliveryDate,
    deliveryTime,
    truckType,
    truckId,
    selectedTruck,
    driverId,
    driverName,
    specialInstructions,
    paymentMethod,
    deliveryAddress,
    sameAsBilling,
    useGlobalDeliveryAddress,
    subtotal,
    deliveryFee,
    setSelectedCustomer,
    setCart,
    setAdjustments,
    setDeliveryMethod,
    setOrderType,
    setSplits,
    setDeliveryDate,
    setDeliveryTime,
    setTruckType,
    setTruckId,
    setSelectedTruck,
    setDriverId,
    setDriverName,
    setSpecialInstructions,
    setPaymentMethod,
    setDeliveryAddress,
    setSameAsBilling,
    setUseGlobalDeliveryAddress,
    nextStep,
    prevStep,
    getTotalSteps
  } = useOrderFormState();

  const { handleDriverChange } = useDriverManager(setDriverId, setDriverName);

  const handleTruckSelect = (newTruckId: string, truckDetails: Truck | null) => {
    setTruckId(newTruckId);
    setSelectedTruck(truckDetails);
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) return;

    setIsCreating(true);
    try {
      // Transform CartItem[] to Product[] for order creation
      const products = cart.map(cartItem => ({
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: cartItem.unit_price,
        quantity: cartItem.quantity
      }));

      // For pickup orders, we don't need truck/driver details
      const validTruckType = deliveryMethod === "pickup" ? "" : (truckType || "small");

      const result = await createOrder({
        selectedCustomer,
        cart: products,
        subtotal,
        adjustments,
        deliveryFee,
        deliveryMethod: deliveryMethod || "delivery",
        orderType,
        splits,
        deliveryDate: deliveryMethod === "pickup" ? "" : deliveryDate,
        deliveryTime: deliveryMethod === "pickup" ? "" : deliveryTime,
        truckType: validTruckType,
        truckId: deliveryMethod === "pickup" ? "" : truckId,
        driverId: deliveryMethod === "pickup" ? "" : driverId,
        specialInstructions,
        paymentMethod,
        deliveryAddress,
        sameAsBilling
      });

      if (result.type === 'single') {
        toast({
          title: "Success",
          description: `Order ${result.orderNumber} created successfully!`,
        });
      } else {
        toast({
          title: "Success",
          description: `Split order ${result.orderNumber} created with ${result.splitCount} parts!`,
        });
      }

      onOrderCreated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const currentTotalSteps = getTotalSteps();

  return (
    <div className="space-y-6">
      <ProgressIndicator 
        currentStep={currentStep} 
        deliveryMethod={deliveryMethod}
        totalSteps={currentTotalSteps} 
      />

      {currentStep === 1 && (
        <CustomerSearchStep
          selectedCustomer={selectedCustomer}
          onCustomerSelect={setSelectedCustomer}
          onNext={nextStep}
        />
      )}

      {currentStep === 2 && (
        <ProductSelectionStep
          cart={cart}
          subtotal={subtotal}
          adjustments={adjustments}
          onCartUpdate={setCart}
          onAdjustmentsChange={setAdjustments}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {currentStep === 3 && (
        <DeliveryMethodSelectionStep
          deliveryMethod={deliveryMethod}
          onDeliveryMethodChange={setDeliveryMethod}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Order Type Selection - Only for delivery orders */}
      {currentStep === 4 && deliveryMethod === "delivery" && (
        <OrderTypeSelectionStep
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Payment Step for Pickup Orders (Step 4) */}
      {currentStep === 4 && deliveryMethod === "pickup" && selectedCustomer && (
        <PaymentMethodStep
          customer={selectedCustomer}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Review Step for Pickup Orders (Step 5) */}
      {currentStep === 5 && deliveryMethod === "pickup" && selectedCustomer && (
        <OrderReviewStep
          customer={selectedCustomer}
          cart={cart}
          subtotal={subtotal}
          adjustments={adjustments}
          deliveryFee={deliveryFee}
          deliveryMethod={deliveryMethod || "delivery"}
          deliveryDate=""
          deliveryTime=""
          truckType=""
          driverName=""
          specialInstructions=""
          paymentMethod={paymentMethod}
          selectedTruck={null}
          onBack={prevStep}
          onConfirm={handleCreateOrder}
          isCreating={isCreating}
        />
      )}

      {/* Delivery Address Step - Only for delivery orders */}
      {currentStep === 5 && selectedCustomer && deliveryMethod === "delivery" && (
        <DeliveryAddressStep
          customer={selectedCustomer}
          orderType={orderType}
          deliveryAddress={deliveryAddress}
          sameAsBilling={sameAsBilling}
          useGlobalDeliveryAddress={useGlobalDeliveryAddress}
          splits={splits}
          onDeliveryAddressChange={setDeliveryAddress}
          onSameAsBillingChange={setSameAsBilling}
          onUseGlobalDeliveryAddressChange={setUseGlobalDeliveryAddress}
          onSplitsChange={setSplits}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Split Order Configuration - Only for delivery split orders */}
      {currentStep === 6 && orderType === "split" && deliveryMethod === "delivery" && (
        <SplitOrderConfigurationStep
          cart={cart}
          splits={splits}
          onSplitsChange={setSplits}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Delivery Details - Only for delivery single orders */}
      {currentStep === 6 && orderType === "single" && deliveryMethod === "delivery" && (
        <DeliveryDetailsStep
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          truckType={truckType}
          truckId={truckId}
          driverId={driverId}
          specialInstructions={specialInstructions}
          onDeliveryDateChange={setDeliveryDate}
          onDeliveryTimeChange={setDeliveryTime}
          onTruckTypeChange={setTruckType}
          onTruckSelect={handleTruckSelect}
          onDriverChange={handleDriverChange}
          onSpecialInstructionsChange={setSpecialInstructions}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Payment step for delivery orders (Step 7) */}
      {currentStep === 7 && deliveryMethod === "delivery" && selectedCustomer && (
        <PaymentMethodStep
          customer={selectedCustomer}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {/* Review step for delivery orders (Step 8) */}
      {currentStep === 8 && deliveryMethod === "delivery" && selectedCustomer && (
        <OrderReviewStep
          customer={selectedCustomer}
          cart={cart}
          subtotal={subtotal}
          adjustments={adjustments}
          deliveryFee={deliveryFee}
          deliveryMethod={deliveryMethod || "delivery"}
          deliveryDate={orderType === "single" ? deliveryDate : splits[0]?.deliveryDate || ""}
          deliveryTime={orderType === "single" ? deliveryTime : splits[0]?.deliveryTime || ""}
          truckType={orderType === "single" ? truckType : ("split" as any)}
          driverName={orderType === "single" ? driverName : "Multiple drivers"}
          specialInstructions={orderType === "single" ? specialInstructions : `Split order with ${splits.length} parts`}
          paymentMethod={paymentMethod}
          selectedTruck={orderType === "single" ? selectedTruck : null}
          onBack={prevStep}
          onConfirm={handleCreateOrder}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
