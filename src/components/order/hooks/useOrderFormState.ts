
import { useState, useEffect, useRef } from "react";
import { Customer, CartItem, SplitConfig, TruckType, Truck, SelectedContact } from "../types";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";

const STORAGE_KEY = "order_form_draft";

// Read any saved draft synchronously so initial useState calls hydrate from it.
// This survives auth redirects (session expiry → AuthPage → sign back in)
// and full page refreshes within the same browser tab/session.
function loadDraft(): any | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error loading order draft:', error);
    return null;
  }
}

export function useOrderFormState() {
  const draft = loadDraft();
  const [currentStep, setCurrentStep] = useState<number>(draft?.currentStep ?? 1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(
    draft?.maxReachedStep ?? draft?.currentStep ?? 1
  );
  // True only on the initial render after restoring a non-trivial draft so
  // the form can show a "resumed" banner.
  const [hasResumedDraft, setHasResumedDraft] = useState<boolean>(
    !!draft && (!!draft.selectedCustomer || (Array.isArray(draft.cart) && draft.cart.length > 0))
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(draft?.selectedCustomer ?? null);
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(draft?.selectedContact ?? null);
  const [cart, setCart] = useState<CartItem[]>(draft?.cart ?? []);
  const [adjustments, setAdjustments] = useState<number>(draft?.adjustments ?? 0);
  
  // Delivery method state - starts with delivery as default
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">(draft?.deliveryMethod ?? "delivery");
  
  // Order splitting state - auto-set to "single" for pickup orders
  const [orderType, setOrderType] = useState<"single" | "split">(draft?.orderType ?? "single");
  const [splits, setSplits] = useState<SplitConfig[]>(draft?.splits ?? []);
  
  // Single order delivery state
  const [deliveryDate, setDeliveryDate] = useState<string>(draft?.deliveryDate ?? "");
  const [deliveryTime, setDeliveryTime] = useState<string>(draft?.deliveryTime ?? "");
  const [pickupTiming, setPickupTiming] = useState<"now" | "scheduled">(draft?.pickupTiming ?? "scheduled");
  const [specialInstructions, setSpecialInstructions] = useState<string>(draft?.specialInstructions ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>(draft?.paymentMethod ?? "");
  
  // New notes state
  const [orderNotes, setOrderNotes] = useState<string>(draft?.orderNotes ?? "");
  const [deliveryNotes, setDeliveryNotes] = useState<string>(draft?.deliveryNotes ?? "");
  
  // Purchase order state
  const [purchaseOrder, setPurchaseOrder] = useState<string>(draft?.purchaseOrder ?? "");
  
  // Delivery address state
  const [deliveryAddress, setDeliveryAddress] = useState<string>(draft?.deliveryAddress ?? "");
  const [sameAsBilling, setSameAsBilling] = useState<boolean>(draft?.sameAsBilling ?? true);
  const [useGlobalDeliveryAddress, setUseGlobalDeliveryAddress] = useState<boolean>(draft?.useGlobalDeliveryAddress ?? true);
  
  // Suburb state (no automatic rate setting)
  const [selectedSuburbId, setSelectedSuburbId] = useState<string>(draft?.selectedSuburbId ?? "");
  
  // Manual delivery fee state (number, not string)
  const [manualDeliveryFee, setManualDeliveryFee] = useState<number>(draft?.manualDeliveryFee ?? 0);
  const [isDeliveryFeeManuallySet, setIsDeliveryFeeManuallySet] = useState<boolean>(draft?.isDeliveryFeeManuallySet ?? false);

  // Track if address was auto-populated from customer
  const [isUsingCustomerAddress, setIsUsingCustomerAddress] = useState<boolean>(draft?.isUsingCustomerAddress ?? false);

  // Suppress the "customer changed → clear address" effect on the very first
  // render when we hydrated a customer from the draft (otherwise the saved
  // address/suburb would be wiped immediately after restore).
  const hydratedFromDraft = useRef<boolean>(!!draft?.selectedCustomer);

  // Fetch payment settings for calculations
  const { data: paymentSettings } = usePaymentSettings();
  
  // Delivery fee calculation hook
  const { autoPopulateDeliveryFee, getDeliveryFeeInfo } = useDeliveryFeeCalculation();

  // When customer changes, clear address (don't auto-populate - user can tick checkbox to use customer address)
  useEffect(() => {
    // Skip on the first render after a draft hydration so we don't wipe the
    // restored address/suburb. Subsequent customer changes still clear it.
    if (hydratedFromDraft.current) {
      hydratedFromDraft.current = false;
      return;
    }

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

  // Auto-save the draft to sessionStorage on every relevant change. Debounced
  // (~400ms) so we don't thrash storage on every keystroke. This means an
  // expired session, accidental refresh, or browser crash never costs the
  // operator the customer's order details — they reappear on remount.
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        const snapshot = {
          currentStep,
          maxReachedStep,
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
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (error) {
        // sessionStorage can throw in private mode / quota — swallow silently.
        console.warn('Could not save order draft:', error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [
    currentStep, maxReachedStep, selectedCustomer, selectedContact, cart, adjustments,
    deliveryMethod, orderType, splits, deliveryDate, deliveryTime, pickupTiming,
    specialInstructions, paymentMethod, orderNotes, deliveryNotes, purchaseOrder,
    deliveryAddress, sameAsBilling, useGlobalDeliveryAddress, selectedSuburbId,
    manualDeliveryFee, isDeliveryFeeManuallySet, isUsingCustomerAddress,
  ]);


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

  // Suburb change handler with auto-population (uses markup-aware calculation).
  // Changing the suburb is an explicit user action and must always re-populate
  // the fee — even if the user previously edited it manually for a different
  // suburb. Otherwise a stale isDeliveryFeeManuallySet flag (which now persists
  // across sessions via the order draft) silently leaves the fee at $0.
  const handleSuburbChange = (suburbId: string, suburb?: any) => {
    const suburbChanged = suburbId !== selectedSuburbId;
    setSelectedSuburbId(suburbId);

    if (suburb && deliveryMethod === "delivery" && (suburbChanged || !isDeliveryFeeManuallySet)) {
      autoPopulateDeliveryFee(suburbId, (fee: number) => {
        setManualDeliveryFee(fee);
        setIsDeliveryFeeManuallySet(false);
      });
    }
  };

  // Handle manual delivery fee changes. Only treat the input as "manually set"
  // when the user actually typed a value — clearing the field to retype must
  // not collapse the fee to $0 with the manual-set lock turned on.
  const handleManualDeliveryFeeChange = (fee: number) => {
    if (!Number.isFinite(fee) || fee < 0) return;
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
    if (!selectedCustomer?.full_address) return;
    setDeliveryAddress(selectedCustomer.full_address);
    setIsUsingCustomerAddress(true);
    setSameAsBilling(true); // Address is now same as billing

    if (selectedCustomer.suburb_id) {
      // Clear any stale manual-set lock so toggling the checkbox always
      // re-populates the fee from the customer's registered suburb rate.
      setIsDeliveryFeeManuallySet(false);
      // Route through handleSuburbChange so autoPopulateDeliveryFee runs and
      // pushes the suburb's delivery_rate (incl. markup) into manualDeliveryFee.
      handleSuburbChange(selectedCustomer.suburb_id, { __forceRepopulate: true });
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
      const next = Math.min(prev + 1, totalSteps);
      setMaxReachedStep(m => Math.max(m, next));
      return next;
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Jump to any previously reached step (used by clickable progress bar).
  const goToStep = (step: number) => {
    const totalSteps = getTotalSteps();
    const target = Math.max(1, Math.min(step, totalSteps));
    if (target <= maxReachedStep) {
      setCurrentStep(target);
    }
  };

  const dismissResumedDraft = () => setHasResumedDraft(false);

  // Calculate totals using payment settings
  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const currentDeliveryFee = deliveryMethod === "pickup" ? 0 : manualDeliveryFee;
  
  // Use dynamic calculation with payment settings
  const splitCount = orderType === 'split' && splits.length > 0 ? splits.length : 1;
  const orderTotals = paymentSettings ? 
    calculateOrderTotals(subtotal, adjustments, currentDeliveryFee, paymentMethod, paymentSettings, deliveryMethod, splitCount) :
    {
      subtotal,
      adjustments,
      deliveryFee: currentDeliveryFee,
      fuelSurcharge: 0,
      fuelSurchargePerUnit: 0,
      splitCount: 1,
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
    maxReachedStep,
    hasResumedDraft,
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
    goToStep,
    dismissResumedDraft,
    setMaxReachedStep,
    getTotalSteps
  };
}
