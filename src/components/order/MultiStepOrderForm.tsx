import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { OrderTypeSelectionStep } from "./OrderTypeSelectionStep";
import { SplitOrderConfigurationStep } from "./SplitOrderConfigurationStep";
import { DeliveryDetailsStep } from "./DeliveryDetailsStep";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { OrderReviewStep } from "./OrderReviewStep";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: number;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  images: string[];
  category?: {
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
  status: string;
  capacity_tons: number | null;
  fuel_type: string | null;
  year_manufactured: number | null;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
}

interface MultiStepOrderFormProps {
  onOrderCreated: () => void;
  onClose: () => void;
}

export function MultiStepOrderForm({ onOrderCreated, onClose }: MultiStepOrderFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
  // New state for order splitting
  const [orderType, setOrderType] = useState<"single" | "split">("single");
  const [splits, setSplits] = useState<Array<{
    id: string;
    name: string;
    products: Array<{ productId: string; quantity: number; }>;
    truckType: TruckType | "";
    truckId: string;
    driverId: string;
    deliveryDate: string;
    deliveryTime: string;
    specialInstructions: string;
  }>>([]);
  
  // Existing delivery state (for single orders)
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [truckType, setTruckType] = useState<TruckType | "">("");
  const [truckId, setTruckId] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const deliveryFee = selectedCustomer?.suburb?.delivery_rate || 0;

  const handleDriverChange = async (newDriverId: string) => {
    setDriverId(newDriverId);
    if (newDriverId) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', newDriverId)
        .single();
      
      if (data) {
        setDriverName(data.full_name || data.email);
      }
    } else {
      setDriverName("");
    }
  };

  const handleTruckSelect = (newTruckId: string, truckDetails: Truck | null) => {
    setTruckId(newTruckId);
    setSelectedTruck(truckDetails);
  };

  const createOrder = async () => {
    if (!selectedCustomer) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (orderType === "single") {
        // Create single order (existing logic)
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        let paymentStatus = 'pending';
        if (paymentMethod === 'account') {
          paymentStatus = 'account_billing';
        } else if (paymentMethod === '7_day_invoice') {
          paymentStatus = 'invoiced';
        }

        const orderData = {
          order_number: orderNumber,
          customer_id: selectedCustomer.id,
          customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
          customer_phone: selectedCustomer.phone,
          customer_address: selectedCustomer.full_address,
          products: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.unit_price
          })),
          subtotal: subtotal,
          adjustments: adjustments,
          delivery_fee: deliveryFee,
          total_amount: subtotal + adjustments + deliveryFee,
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          truck_type: truckType as TruckType,
          truck_id: truckId || null,
          driver_id: driverId || null,
          admin_id: user.id,
          special_instructions: specialInstructions || null,
          payment_method: paymentMethod,
          status: 'requested' as Database["public"]["Enums"]["order_status"],
          payment_status: paymentStatus,
          is_split_order: false,
          master_order_id: null,
          split_number: null
        };

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = cart.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          price_adjustment: 0
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update truck status if needed
        if (truckId) {
          await supabase
            .from('trucks')
            .update({ status: 'assigned' })
            .eq('id', truckId);
        }

        toast({
          title: "Success",
          description: `Order ${orderNumber} created successfully!`,
        });
      } else {
        // Create split orders
        const masterOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        let paymentStatus = 'pending';
        if (paymentMethod === 'account') {
          paymentStatus = 'account_billing';
        } else if (paymentMethod === '7_day_invoice') {
          paymentStatus = 'invoiced';
        }

        // Create master order
        const masterOrderData = {
          order_number: masterOrderNumber,
          customer_id: selectedCustomer.id,
          customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
          customer_phone: selectedCustomer.phone,
          customer_address: selectedCustomer.full_address,
          products: cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.unit_price
          })),
          subtotal: subtotal,
          adjustments: adjustments,
          delivery_fee: deliveryFee,
          total_amount: subtotal + adjustments + deliveryFee,
          delivery_date: splits[0]?.deliveryDate || null,
          delivery_time: splits[0]?.deliveryTime || null,
          truck_type: null,
          truck_id: null,
          driver_id: null,
          admin_id: user.id,
          special_instructions: `Master order for ${splits.length} splits`,
          payment_method: paymentMethod,
          status: 'requested' as Database["public"]["Enums"]["order_status"],
          payment_status: paymentStatus,
          is_split_order: false,
          master_order_id: null,
          split_number: null
        };

        const { data: masterOrder, error: masterOrderError } = await supabase
          .from('orders')
          .insert(masterOrderData)
          .select()
          .single();

        if (masterOrderError) throw masterOrderError;

        // Create individual split orders
        for (let i = 0; i < splits.length; i++) {
          const split = splits[i];
          const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;
          
          const splitProducts = split.products.map(splitProduct => {
            const cartItem = cart.find(item => item.product.id === splitProduct.productId);
            return {
              id: splitProduct.productId,
              name: cartItem?.product.name || '',
              quantity: splitProduct.quantity,
              price: cartItem?.unit_price || 0
            };
          });

          const splitSubtotal = split.products.reduce((sum, splitProduct) => {
            const cartItem = cart.find(item => item.product.id === splitProduct.productId);
            return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
          }, 0);

          const splitOrderData = {
            order_number: splitOrderNumber,
            customer_id: selectedCustomer.id,
            customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
            customer_phone: selectedCustomer.phone,
            customer_address: selectedCustomer.full_address,
            products: splitProducts,
            subtotal: splitSubtotal,
            adjustments: 0,
            delivery_fee: i === 0 ? deliveryFee : 0, // Only charge delivery fee on first split
            total_amount: splitSubtotal + (i === 0 ? deliveryFee : 0),
            delivery_date: split.deliveryDate,
            delivery_time: split.deliveryTime,
            truck_type: split.truckType as TruckType || null,
            truck_id: split.truckId || null,
            driver_id: split.driverId || null,
            admin_id: user.id,
            special_instructions: split.specialInstructions || null,
            payment_method: paymentMethod,
            status: 'requested' as Database["public"]["Enums"]["order_status"],
            payment_status: paymentStatus,
            is_split_order: true,
            master_order_id: masterOrder.id,
            split_number: i + 1
          };

          const { data: splitOrder, error: splitOrderError } = await supabase
            .from('orders')
            .insert(splitOrderData)
            .select()
            .single();

          if (splitOrderError) throw splitOrderError;

          // Create order items for this split
          const splitOrderItems = split.products.map(splitProduct => {
            const cartItem = cart.find(item => item.product.id === splitProduct.productId);
            return {
              order_id: splitOrder.id,
              product_id: splitProduct.productId,
              quantity: splitProduct.quantity,
              unit_price: cartItem?.unit_price || 0,
              total_price: (cartItem?.unit_price || 0) * splitProduct.quantity,
              price_adjustment: 0
            };
          });

          const { error: splitItemsError } = await supabase
            .from('order_items')
            .insert(splitOrderItems);

          if (splitItemsError) throw splitItemsError;

          // Update truck status if assigned
          if (split.truckId) {
            await supabase
              .from('trucks')
              .update({ status: 'assigned' })
              .eq('id', split.truckId);
          }
        }

        toast({
          title: "Success",
          description: `Split order ${masterOrderNumber} created with ${splits.length} parts!`,
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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 6 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
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
          truckType={orderType === "single" ? truckType as TruckType : ("split" as any)}
          driverName={orderType === "single" ? driverName : "Multiple drivers"}
          specialInstructions={orderType === "single" ? specialInstructions : `Split order with ${splits.length} parts`}
          paymentMethod={paymentMethod}
          selectedTruck={orderType === "single" ? selectedTruck : null}
          onBack={prevStep}
          onConfirm={createOrder}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
