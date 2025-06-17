import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { OrderTypeSelectionStep } from "./OrderTypeSelectionStep";
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
    subtotal,
    deliveryFee,
    setSelectedCustomer,
    setCart,
    setAdjustments,
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
    nextStep,
    prevStep
  } = useOrderFormState();

  const { handleDriverChange } = useDriverManager(setDriverId, setDriverName);

  const handleTruckSelect = (newTruckId: string, truckDetails: Truck | null) => {
    setTruckId(newTruckId);
    setSelectedTruck(truckDetails);
  };

  // Frontend validation before order creation
  const validateOrderData = () => {
    console.log('Validating order data on frontend...');

    if (!selectedCustomer) {
      throw new Error('Please select a customer');
    }

    if (!cart || cart.length === 0) {
      throw new Error('Please add at least one product to the cart');
    }

    if (!paymentMethod) {
      throw new Error('Please select a payment method');
    }

    if (orderType === 'single') {
      if (!deliveryDate) {
        throw new Error('Please select a delivery date');
      }
      if (!deliveryTime) {
        throw new Error('Please select a delivery time');
      }
      if (!truckType) {
        throw new Error('Please select a truck type');
      }
    } else if (orderType === 'split') {
      if (!splits || splits.length === 0) {
        throw new Error('Please configure at least one split delivery');
      }
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        if (!split.deliveryDate) {
          throw new Error(`Please set delivery date for split ${i + 1}`);
        }
        if (!split.deliveryTime) {
          throw new Error(`Please set delivery time for split ${i + 1}`);
        }
      }
    }

    // Validate cart items have required fields
    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      if (!item.product || !item.product.id) {
        throw new Error(`Product ${i + 1} is missing required information`);
      }
      if (!item.product.name) {
        throw new Error(`Product ${i + 1} is missing a name`);
      }
      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        throw new Error(`Product ${i + 1} has an invalid price`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Product ${i + 1} has an invalid quantity`);
      }
    }

    console.log('Frontend validation passed');
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Frontend validation
      validateOrderData();

      // Transform CartItem[] to Product[] for order creation
      const products = cart.map(cartItem => ({
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: cartItem.unit_price,
        quantity: cartItem.quantity
      }));

      // Ensure truckType is not empty string - use default for split orders
      const validTruckType = (orderType === 'single' && truckType) ? truckType : "small";

      console.log('Submitting order creation with validated data:', {
        customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        productCount: products.length,
        orderType,
        totalAmount: subtotal + adjustments + deliveryFee
      });

      const result = await createOrder({
        selectedCustomer,
        cart: products,
        subtotal,
        adjustments,
        deliveryFee,
        orderType,
        splits,
        deliveryDate,
        deliveryTime,
        truckType: validTruckType,
        truckId: truckId || '', // Convert null to empty string if needed
        driverId: driverId || '', // Convert null to empty string if needed
        specialInstructions: specialInstructions || '',
        paymentMethod
      });

      console.log('Order creation successful:', result);

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
      console.error('Order creation failed:', error);
      
      // Show specific error message to user
      const errorMessage = error.message || "Failed to create order due to an unexpected error";
      
      toast({
        title: "Order Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProgressIndicator currentStep={currentStep} />

      
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
        <OrderTypeSelectionStep
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {currentStep === 4 && orderType === "split" && (
        <SplitOrderConfigurationStep
          cart={cart}
          splits={splits}
          onSplitsChange={setSplits}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {currentStep === 4 && orderType === "single" && (
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

      {currentStep === 5 && selectedCustomer && (
        <PaymentMethodStep
          customer={selectedCustomer}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onBack={prevStep}
          onNext={nextStep}
        />
      )}

      {currentStep === 6 && selectedCustomer && (
        <OrderReviewStep
          customer={selectedCustomer}
          cart={cart}
          subtotal={subtotal}
          adjustments={adjustments}
          deliveryFee={deliveryFee}
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
