
import { useState } from "react";
import { Customer, CartItem, SplitConfig, TruckType, Truck } from "../types";

export function useOrderFormState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
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

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const deliveryFee = selectedCustomer?.suburb?.delivery_rate || 0;

  return {
    // State
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
    
    // Setters
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
    
    // Navigation
    nextStep,
    prevStep,
    setCurrentStep
  };
}
