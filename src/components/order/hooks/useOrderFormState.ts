
import { useState, useEffect } from "react";
import { Customer, CartItem, SplitConfig, TruckType, Truck, SelectedContact } from "../types";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";

const STORAGE_KEY = "order_form_draft";

export function useOrderFormState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState(0);
  
  // Delivery method state - starts with delivery as default
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  
  // Order splitting state - auto-set to "single" for pickup orders
  const [orderType, setOrderType] = useState<"single" | "split">("single");
  const [splits, setSplits] = useState<SplitConfig[]>([]);
  
  // Single order delivery state
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [pickupTiming, setPickupTiming] = useState<"now" | "scheduled">("scheduled");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  
  // New notes state
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  
  // Purchase order state
  const [purchaseOrder, setPurchaseOrder] = useState("");
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [useGlobalDeliveryAddress, setUseGlobalDeliveryAddress] = useState(true);
  
  // Suburb state (no automatic rate setting)
  const [selectedSuburbId, setSelectedSuburbId] = useState("");
  
  // Manual delivery fee state (number, not string)
  const [manualDeliveryFee, setManualDeliveryFee] = useState<number>(0);
  const [isDeliveryFeeManuallySet, setIsDeliveryFeeManuallySet] = useState(false);

  // Track if address was auto-populated from customer
  const [isUsingCustomerAddress, setIsUsingCustomerAddress] = useState(false);

  // Fetch payment settings for calculations
  const { data: paymentSettings } = usePaymentSettings();
  
  // Delivery fee calculation hook
  const { autoPopulateDeliveryFee, getDeliveryFeeInfo } = useDeliveryFeeCalculation();

  // When customer changes, clear address (don't auto-populate - user can tick checkbox to use customer address)
  useEffect(() => {
    if (selectedCustomer) {
      // Clear delivery address when customer changes (don't auto-populate)
      setDeliveryAddress("");
      setIsUsingCustomerAddress(false);
      setSameAsBilling(false);
      setSelectedSuburbId(""); // Also clear suburb
    }
    
    // Clear contact when customer changes
    if (!selectedCustomer) {
      setSelectedContact(null);
    }
  }, [selectedCustomer]);

  // Dynamic step calculation based on delivery method
  const getTotalSteps = () => {
    if (deliveryMethod === "pickup") {
      return 6; // Customer → Products → Method → Pickup Scheduling → Payment → Review
    }
    return 7; // Customer → Products → Method → Order Type → Address → Payment → Review
  };

  // Enhanced delivery method setter to auto-set order type
  const handleDeliveryMethodChange = (method: "delivery" | "pickup") => {
    setDeliveryMethod(method);
    if (method === "pickup") {
      setOrderType("single"); // Auto-set to single for pickup orders
      setManualDeliveryFee(0); // Clear delivery fee for pickup
      setSelectedSuburbId(""); // Clear suburb for pickup
      setSameAsBilling(true); // Force same as billing for pickup
      setPickupTiming("scheduled"); // Reset to scheduled pickup
    }
  };

  // Suburb change handler with auto-population (uses markup-aware calculation)
  const handleSuburbChange = (suburbId: string, suburb?: any) => {
    setSelectedSuburbId(suburbId);
    
    if (suburb && !isDeliveryFeeManuallySet && deliveryMethod === "delivery") {
      autoPopulateDeliveryFee(suburbId, (fee: number) => {
        setManualDeliveryFee(fee);
        setIsDeliveryFeeManuallySet(false);
      });
    }
  };

  // Handle manual delivery fee changes
  const handleManualDeliveryFeeChange = (fee: number) => {
    setManualDeliveryFee(fee);
    setIsDeliveryFeeManuallySet(true);
  };

  // Set delivery fee from split totals without marking it as manually set
  const setDeliveryFeeFromSplits = (fee: number) => {
    setManualDeliveryFee(fee);
    setIsDeliveryFeeManuallySet(false);
  };

  // Clear delivery address and reset to customer address
  const clearDeliveryAddress = () => {
    setDeliveryAddress("");
    setSelectedSuburbId("");
    setIsUsingCustomerAddress(false);
    setSameAsBilling(false); // Address is now different from billing
  };

  const resetToCustomerAddress = () => {
    if (selectedCustomer && selectedCustomer.full_address) {
      setDeliveryAddress(selectedCustomer.full_address);
      setIsUsingCustomerAddress(true);
      setSameAsBilling(true); // Address is now same as billing
      
      if (selectedCustomer.suburb_id) {
        setSelectedSuburbId(selectedCustomer.suburb_id);
      }
    }
  };

  // Handle delivery address change - detect if user is manually editing
  const handleDeliveryAddressChange = (address: string) => {
    setDeliveryAddress(address);
    
    // Compare with customer's billing address to determine sameAsBilling
    if (selectedCustomer) {
      const isSameAsBilling = address === selectedCustomer.full_address;
      setSameAsBilling(isSameAsBilling);
      setIsUsingCustomerAddress(isSameAsBilling);
    } else {
      // If no customer selected, it's definitely not same as billing
      setSameAsBilling(false);
      setIsUsingCustomerAddress(false);
    }
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
  const currentDeliveryFee = deliveryMethod === "pickup" ? 0 : manualDeliveryFee;
  
  // Use dynamic calculation with payment settings
  const orderTotals = paymentSettings ? 
    calculateOrderTotals(subtotal, adjustments, currentDeliveryFee, paymentMethod, paymentSettings) :
    {
      subtotal,
      adjustments,
      deliveryFee: currentDeliveryFee,
      surchargeAmount: 0,
      gstAmount: (subtotal + adjustments + currentDeliveryFee) / 11, // GST included calculation
      totalAmount: subtotal + adjustments + currentDeliveryFee, // No extra GST - already included
      baseAmount: subtotal + adjustments + currentDeliveryFee,
      hasSurcharge: false,
      surchargeRate: 0,
      gstRate: 10,
      gstIncluded: true
    };

  // Function to clear the draft
  const clearOrderDraft = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('Order draft cleared from sessionStorage');
    } catch (error) {
      console.error('Error clearing order draft:', error);
    }
  };

  return {
    // State
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
    isDeliveryFeeManuallySet,
    isUsingCustomerAddress,
    subtotal: orderTotals.subtotal,
    deliveryFee: orderTotals.deliveryFee,
    surchargeAmount: orderTotals.surchargeAmount,
    gstAmount: orderTotals.gstAmount,
    totalAmount: orderTotals.totalAmount,
    orderTotals,
    paymentSettings,
    
    // Setters
    setSelectedCustomer,
    setSelectedContact,
    setCart,
    setAdjustments,
    setDeliveryMethod: handleDeliveryMethodChange,
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
    setDeliveryAddress: handleDeliveryAddressChange,
    setSameAsBilling,
    setUseGlobalDeliveryAddress,
    setSelectedSuburbId,
    setManualDeliveryFee: handleManualDeliveryFeeChange,
    setDeliveryFeeFromSplits,
    handleSuburbChange,
    getDeliveryFeeInfo,
    clearDeliveryAddress,
    resetToCustomerAddress,
    clearOrderDraft,
    
    // Navigation
    nextStep,
    prevStep,
    setCurrentStep,
    getTotalSteps
  };
}
