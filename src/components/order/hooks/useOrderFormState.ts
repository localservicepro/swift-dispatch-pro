
import { useState } from "react";
import { Customer, CartItem, SplitConfig, TruckType, Truck } from "../types";

export function useOrderFormState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "">("");
  
  // Order splitting state
  const [orderType, setOrderType] = useState<"single" | "split">("single");
  const [splits, setSplits] = useState<SplitConfig[]>([]);
  
  // Single order delivery state
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [truckType, setTruckType] = useState<TruckType | "">("");
  const [truckId, setTruckId] = useState("");
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [driverId, setDriverId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [useGlobalDeliveryAddress, setUseGlobalDeliveryAddress] = useState(true);

  // Dynamic step calculation based on delivery method
  const getTotalSteps = () => {
    if (deliveryMethod === "pickup") {
      return 6; // Customer → Products → Delivery Method → Order Type → Payment → Review
    }
    return 8; // Customer → Products → Delivery Method → Order Type → Address → Details → Payment → Review
  };

  const nextStep = () => {
    const totalSteps = getTotalSteps();
    setCurrentStep(prev => {
      const next = prev + 1;
      
      // Skip delivery-related steps for pickup orders
      if (deliveryMethod === "pickup") {
        if (next === 5) return 6; // Skip Address step (5)
        if (next === 6) return 7; // Skip Details step (6)
      }
      
      return Math.min(next, totalSteps);
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => {
      const previous = prev - 1;
      
      // Skip delivery-related steps for pickup orders when going back
      if (deliveryMethod === "pickup") {
        if (previous === 6) return 5; // Skip Details step (6)
        if (previous === 5) return 4; // Skip Address step (5)
      }
      
      return Math.max(previous, 1);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const deliveryFee = deliveryMethod === "pickup" ? 0 : (selectedCustomer?.suburb?.delivery_rate || 0);

  return {
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
    
    // Setters
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
    
    // Navigation
    nextStep,
    prevStep,
    setCurrentStep,
    getTotalSteps
  };
}
