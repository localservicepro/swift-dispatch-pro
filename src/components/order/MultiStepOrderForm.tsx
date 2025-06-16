
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CustomerSearchStep } from "./CustomerSearchStep";
import { ProductSelectionStep } from "./ProductSelectionStep";
import { DeliveryDetailsStep } from "./DeliveryDetailsStep";
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
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [truckType, setTruckType] = useState<TruckType | "">("");
  const [truckId, setTruckId] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
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

      // Generate order number
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      // Create order with 'requested' status
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
        status: 'requested' as const,
        payment_status: 'pending' as const
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
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

      // Update truck status to assigned if a specific truck was selected
      if (truckId) {
        const { error: truckError } = await supabase
          .from('trucks')
          .update({ status: 'assigned' })
          .eq('id', truckId);

        if (truckError) {
          console.error('Error updating truck status:', truckError);
          // Don't throw here as the order was created successfully
        }
      }

      toast({
        title: "Success",
        description: `Order ${orderNumber} created successfully! It's now in the pipeline awaiting confirmation.`,
      });

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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((step) => (
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
            {step < 4 && (
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

      {currentStep === 4 && selectedCustomer && (
        <OrderReviewStep
          customer={selectedCustomer}
          cart={cart}
          subtotal={subtotal}
          adjustments={adjustments}
          deliveryFee={deliveryFee}
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          truckType={truckType as TruckType}
          driverName={driverName}
          specialInstructions={specialInstructions}
          selectedTruck={selectedTruck}
          onBack={prevStep}
          onConfirm={createOrder}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
