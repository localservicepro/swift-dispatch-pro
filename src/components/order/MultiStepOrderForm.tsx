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
import { orderCreationService } from "./services/orderCreationService";
import { Truck, Split } from "./types";
import { Database } from "@/integrations/supabase/types";
import { SplitOrderData, OrderFormData } from "@/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

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

  const handleCreateSplitOrder = async () => {
    if (!selectedCustomer) return;

    try {
      const splitOrderData: SplitOrderData = {
        customer_id: selectedCustomer.id,
        customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customer_address: selectedCustomer.full_address,
        payment_method: paymentMethod,
        splits: splits.map(split => ({
          ...split,
          truckType: split.truckType as Database["public"]["Enums"]["truck_type"]
        })),
        adjustments,
        deliveryFee,
      };

      console.log('Creating split order with data:', splitOrderData);

      const result = await orderCreationService.createSplitOrder(splitOrderData);

      if (result.success) {
        toast({
          title: "Success",
          description: `Split order ${result.orderNumber} created successfully with ${splits.length} parts!`,
        });

        onOrderCreated();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create split order');
      }
    } catch (error: any) {
      console.error("Split order creation error:", error);
      throw error;
    }
  };

  const handleCreateSingleOrder = async () => {
    if (!selectedCustomer) return;

    try {
      // Transform CartItem[] to OrderItem[] for order creation
      const orderItems = cart.map(cartItem => ({
        product_id: cartItem.product.id,
        quantity: cartItem.quantity,
        price: cartItem.unit_price,
        total: cartItem.total_price
      }));

      const orderData: OrderFormData = {
        customer_id: selectedCustomer.id,
        customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customer_phone: selectedCustomer.phone,
        delivery_date: deliveryDate,
        customer_address: selectedCustomer.full_address,
        total_amount: subtotal + adjustments + deliveryFee,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        adjustments: adjustments,
        payment_status: 'pending',
        status: 'requested' as OrderStatus,
        notes: specialInstructions,
        items: orderItems,
        truck_type: truckType as Database["public"]["Enums"]["truck_type"],
        truck_id: truckId,
        driver_id: driverId,
        delivery_time: deliveryTime,
        special_instructions: specialInstructions,
        payment_method: paymentMethod,
      };

      console.log('Creating single order with data:', orderData);

      const result = await orderCreationService.createOrder(orderData);

      if (result.success) {
        toast({
          title: "Success",
          description: `Order ${result.orderNumber} created successfully!`,
        });

        onOrderCreated();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error("Single order creation error:", error);
      throw error;
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomer) return;

    setIsCreating(true);
    try {
      if (orderType === "split") {
        await handleCreateSplitOrder();
      } else {
        await handleCreateSingleOrder();
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Convert SplitConfig[] to Split[] for OrderReviewStep
  const reviewSplits: Split[] = splits
    .filter(split => split.truckType !== "") // Only include splits with valid truck types
    .map(split => ({
      ...split,
      truckType: split.truckType as Database["public"]["Enums"]["truck_type"]
    }));

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
          orderType={orderType}
          splits={reviewSplits}
          onBack={prevStep}
          onConfirm={handleCreateOrder}
          isCreating={isCreating}
          onSpecialInstructionsChange={orderType === "single" ? setSpecialInstructions : undefined}
          onSplitsChange={orderType === "split" ? setSplits : undefined}
        />
      )}
    </div>
  );
}
