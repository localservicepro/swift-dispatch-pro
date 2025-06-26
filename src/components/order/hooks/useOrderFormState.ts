
import { useState } from "react";
import { Customer, CartItem, SplitConfig, TruckType, Truck } from "../types";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";

export function useOrderFormState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup" | "">("");
  
  // Order splitting state - auto-set to "single" for pickup orders
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
  
  // Suburb and delivery rate state
  const [selectedSuburbId, setSelectedSuburbId] = useState("");
  const [deliveryRate, setDeliveryRate] = useState(0);

  // Fetch payment settings for calculations
  const { data: paymentSettings } = usePaymentSettings();

  // Dynamic step calculation based on delivery method
  const getTotalSteps = () => {
    if (deliveryMethod === "pickup") {
      return 5; // Customer → Products → Method → Payment → Review
    }
    return 8; // Customer → Products → Method → Order Type → Address → Details → Payment → Review
  };

  // Enhanced delivery method setter to auto-set order type
  const handleDeliveryMethodChange = (method: "delivery" | "pickup") => {
    setDeliveryMethod(method);
    if (method === "pickup") {
      setOrderType("single"); // Auto-set to single for pickup orders
      setDeliveryRate(0); // No delivery fee for pickup
      setSelectedSuburbId(""); // Clear suburb for pickup
    }
  };

  // Suburb change handler
  const handleSuburbChange = (suburbId: string, rate: number) => {
    setSelectedSuburbId(suburbId);
    setDeliveryRate(rate);
  };

  const nextStep = () => {
    const totalSteps = getTotalSteps();
    setCurrentStep(prev => {
      const next = prev + 1;
      return Math.min(next, totalSteps);
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Calculate totals using payment settings
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const currentDeliveryFee = deliveryMethod === "pickup" ? 0 : deliveryRate;
  
  // Use dynamic calculation with payment settings
  const orderTotals = paymentSettings ? 
    calculateOrderTotals(subtotal, adjustments, currentDeliveryFee, paymentMethod, paymentSettings) :
    {
      subtotal,
      adjustments,
      deliveryFee: currentDeliveryFee,
      surchargeAmount: 0,
      gstAmount: (subtotal + adjustments + currentDeliveryFee) * 0.1, // fallback 10% GST
      totalAmount: (subtotal + adjustments + currentDeliveryFee) * 1.1,
      baseAmount: subtotal + adjustments + currentDeliveryFee,
      hasSurcharge: false,
      surchargeRate: 0,
      gstRate: 10
    };

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
    selectedSuburbId,
    deliveryRate,
    subtotal: orderTotals.subtotal,
    deliveryFee: orderTotals.deliveryFee,
    surchargeAmount: orderTotals.surchargeAmount,
    gstAmount: orderTotals.gstAmount,
    totalAmount: orderTotals.totalAmount,
    orderTotals,
    paymentSettings,
    
    // Setters
    setSelectedCustomer,
    setCart,
    setAdjustments,
    setDeliveryMethod: handleDeliveryMethodChange,
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
    setSelectedSuburbId,
    setDeliveryRate,
    handleSuburbChange,
    
    // Navigation
    nextStep,
    prevStep,
    setCurrentStep,
    getTotalSteps
  };
}
