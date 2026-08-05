
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Order } from "../OrderEditFormTypes";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";
import { supabase } from "@/integrations/supabase/client";
import { convertTimeToFormFormat } from "@/utils/timeFormatUtils";

export interface OrderFormData {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  purchase_order: string;
  products: any[];
  total_amount: string;
  subtotal: number;
  delivery_fee: number;
  status: string;
  delivery_date: string;
  delivery_time: string;
  order_notes: string;
  delivery_notes: string;
  driver_id: string;
  suburb_id: string;
  delivery_suburb_id: string;
  truck_type: string;
  truck_id: string;
  payment_method: string;
  adjustments: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  delivery_method: string;
  fuel_surcharge: number;
}

export function useOrderFormData(order: Order) {
  const { data: paymentSettings } = usePaymentSettings();
  const { autoPopulateDeliveryFee, getDeliveryFeeInfo } = useDeliveryFeeCalculation();
  const [isDeliveryFeeManuallySet, setIsDeliveryFeeManuallySet] = useState(false);
  
  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    customer_address: order.delivery_address || order.customer_address || '',
    purchase_order: order.purchase_order || '',
    products: Array.isArray(order.products) ? order.products : [],
    total_amount: order.total_amount?.toString() || '0',
    subtotal: Number(order.subtotal) || 0,
    delivery_fee: Number(order.delivery_fee) || 0,
    status: order.status || 'preparing',
    delivery_date: order.delivery_date || '',
    delivery_time: convertTimeToFormFormat(order.delivery_time),
    order_notes: order.order_notes || '',
    delivery_notes: order.delivery_notes || '',
    driver_id: order.driver_id || 'unassigned',
    suburb_id: order.suburb_id || '',
    delivery_suburb_id: order.delivery_suburb_id || '',
    truck_type: order.truck_type || 'none',
    truck_id: order.truck_id || 'none',
    // Preserve the stored settlement method verbatim — never silently default to
    // 'cash', which used to overwrite the real value when an order was reopened.
    payment_method: order.payment_method || '',

    adjustments: order.adjustments?.toString() || '0',
    contact_id: order.contact_id || null,
    contact_name: order.contact_name || null,
    contact_email: order.contact_email || null,
    contact_phone: order.contact_phone || null,
    delivery_method: order.delivery_method || 'delivery',
    fuel_surcharge: Number(order.fuel_surcharge) || 0
  });

  // Always-current snapshot of formData for the calculation helpers.
  // Keeping this in a ref means calculateTotals does NOT need formData as a
  // dependency, so the handlers stay referentially stable across renders and
  // child effects that depend on them no longer re-fire every render.
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Initialize products with current prices from database
  useEffect(() => {
    const initializeProductsWithPrices = async () => {
      if (!order.products || !Array.isArray(order.products) || order.products.length === 0) {
        return;
      }

      try {
        // Get unique product IDs from the order
        const productIds = order.products
          .map(p => p.product_id)
          .filter(Boolean)
          .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

        if (productIds.length === 0) {
          return;
        }

        // Fetch current product prices from database
        const { data: currentProducts, error } = await supabase
          .from('products')
          .select('id, name, price')
          .in('id', productIds);

        if (error) {
          console.error('Error fetching current product prices:', error);
          return;
        }

        // Update order products with current prices
        const updatedProducts = order.products.map(orderProduct => {
          const currentProduct = currentProducts?.find(p => p.id === orderProduct.product_id);
          return {
            ...orderProduct,
            // Use current database price if available, fallback to order price, then 0
            price: currentProduct?.price || Number(orderProduct.unit_price) || Number(orderProduct.price) || 0,
            // Ensure quantity is a number
            quantity: Number(orderProduct.quantity) || 0
          };
        });

        // Calculate initial subtotal
        const initialSubtotal = updatedProducts.reduce((sum, product) => {
          return sum + (Number(product.price) * Number(product.quantity));
        }, 0);

        // Update form data with corrected products and subtotal
        setFormData(prev => ({
          ...prev,
          products: updatedProducts,
          subtotal: initialSubtotal
        }));

      } catch (error) {
        console.error('Error initializing products with prices:', error);
      }
    };

    initializeProductsWithPrices();
  }, [order.id]); // Only depend on order.id to avoid infinite loops

  // Calculate totals whenever pricing components change.
  // IMPORTANT: We use the order's STORED fuel_surcharge (formData.fuel_surcharge),
  // not paymentSettings.fuel_surcharge, so the edit dialog total always matches
  // what is persisted in the database.
  const calculateTotals = useCallback((updatedData: Partial<OrderFormData>) => {
    const currentData = { ...formDataRef.current, ...updatedData };

    const adjustmentsNum = parseFloat(currentData.adjustments) || 0;
    // Pickup orders never carry a fuel surcharge — gate authoritatively here.
    const isPickup = currentData.delivery_method === 'pickup';
    const fuelSurcharge = isPickup ? 0 : (Number(currentData.fuel_surcharge) || 0);

    if (!paymentSettings) {
      const total = currentData.subtotal + currentData.delivery_fee + adjustmentsNum + fuelSurcharge;
      return total.toFixed(2);
    }

    // Pass deliveryMethod='pickup' so the util does NOT add paymentSettings.fuel_surcharge.
    // We add the order's stored fuel_surcharge ourselves below.
    const orderTotals = calculateOrderTotals(
      currentData.subtotal,
      adjustmentsNum,
      currentData.delivery_fee,
      currentData.payment_method,
      paymentSettings,
      'pickup',
      1
    );

    return (orderTotals.totalAmount + fuelSurcharge).toFixed(2);
  }, [paymentSettings]);

  const handleInputChange = useCallback((field: string, value: string) => {
    // Handle pricing fields that need recalculation
    if (field === 'delivery_fee') {
      // Parse delivery fee as number
      let numValue = 0;
      if (value !== '' && value !== '-') {
        const parsed = parseFloat(value);
        numValue = isNaN(parsed) ? 0 : parsed;
      }
      
      const updatedData = { delivery_fee: numValue };
      const newTotal = calculateTotals(updatedData);
      
      setFormData(prev => ({
        ...prev,
        delivery_fee: numValue,
        total_amount: newTotal
      }));
    } else if (field === 'adjustments') {
      // Store adjustments as string to allow typing negative values
      const updatedData = { adjustments: value };
      const newTotal = calculateTotals(updatedData);
      
      setFormData(prev => ({
        ...prev,
        adjustments: value,
        total_amount: newTotal
      }));
    } else if (field === 'payment_method') {
      // Recalculate when payment method changes (affects surcharges)
      const updatedData = { payment_method: value };
      const newTotal = calculateTotals(updatedData);
      
      setFormData(prev => ({
        ...prev,
        payment_method: value,
        total_amount: newTotal
      }));
    } else if (field === 'delivery_method') {
      // When switching to pickup, strip any fuel surcharge and delivery fee carried over from delivery.
      if (value === 'pickup') {
        const updatedData = {
          delivery_method: value,
          fuel_surcharge: 0,
          delivery_fee: 0,
        };
        const newTotal = calculateTotals(updatedData);
        setFormData(prev => ({
          ...prev,
          delivery_method: value,
          fuel_surcharge: 0,
          delivery_fee: 0,
          total_amount: newTotal,
        }));
      } else {
        const updatedData = { delivery_method: value };
        const newTotal = calculateTotals(updatedData);
        setFormData(prev => ({
          ...prev,
          delivery_method: value,
          total_amount: newTotal,
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }, [calculateTotals]);

  const handleDriverChange = useCallback((driverId: string) => {
    setFormData(prev => ({ ...prev, driver_id: driverId }));
  }, []);

  const handleSuburbChange = useCallback((suburbId: string, suburb?: any) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
    
    // Auto-populate delivery fee if not manually set and we have suburb data
    if (suburb && !isDeliveryFeeManuallySet) {
      autoPopulateDeliveryFee(suburbId, (fee: number, isAutoPopulated: boolean) => {
        const updatedData = { delivery_fee: fee };
        const newTotal = calculateTotals(updatedData);
        
        setFormData(prev => ({
          ...prev,
          delivery_fee: fee,
          total_amount: newTotal
        }));
        setIsDeliveryFeeManuallySet(!isAutoPopulated);
      });
    }
  }, [isDeliveryFeeManuallySet, autoPopulateDeliveryFee, calculateTotals]);

  const handleDeliverySuburbChange = useCallback((suburbId: string, suburb?: any) => {
    setFormData(prev => ({ ...prev, delivery_suburb_id: suburbId }));
    
    // Auto-populate delivery fee for delivery suburb if not manually set and we have suburb data
    if (suburb && !isDeliveryFeeManuallySet) {
      autoPopulateDeliveryFee(suburbId, (fee: number, isAutoPopulated: boolean) => {
        const updatedData = { delivery_fee: fee };
        const newTotal = calculateTotals(updatedData);
        
        setFormData(prev => ({
          ...prev,
          delivery_fee: fee,
          total_amount: newTotal
        }));
        setIsDeliveryFeeManuallySet(!isAutoPopulated);
      });
    }
  }, [isDeliveryFeeManuallySet, autoPopulateDeliveryFee, calculateTotals]);

  const handleFormDataChange = useCallback((updates: Partial<OrderFormData>) => {
    // Apply pickup-method gating so toggling via this path also strips surcharge/fee.
    if (updates.delivery_method === 'pickup') {
      const merged = { ...updates, fuel_surcharge: 0, delivery_fee: 0 };
      const newTotal = calculateTotals(merged);
      setFormData(prev => ({ ...prev, ...merged, total_amount: newTotal }));
      return;
    }
    setFormData(prev => ({ ...prev, ...updates }));
  }, [calculateTotals]);

  const handleProductsChange = useCallback((products: any[]) => {
    setFormData(prev => (prev.products === products ? prev : { ...prev, products }));
  }, []);

  const handleSubtotalChange = useCallback((subtotal: number) => {
    const updatedData = { subtotal };
    const newTotal = calculateTotals(updatedData);
    
    setFormData(prev => {
      // Bail out when nothing actually changed. Returning the identical state
      // object lets React skip the re-render, which breaks the
      // render -> recalculate -> setState -> render feedback loop.
      if (prev.subtotal === subtotal && prev.total_amount === newTotal) {
        return prev;
      }
      return {
        ...prev,
        subtotal,
        total_amount: newTotal
      };
    });
  }, [calculateTotals]);

  const handleContactChange = useCallback((contactData: {
    contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }) => {
    setFormData(prev => ({
      ...prev,
      ...contactData
    }));
  }, []);

  // Recalculate totals when payment settings are loaded
  useEffect(() => {
    if (paymentSettings) {
      const newTotal = calculateTotals({});
      setFormData(prev => (prev.total_amount === newTotal ? prev : {
        ...prev,
        total_amount: newTotal
      }));
    }
  }, [paymentSettings, calculateTotals]);

  const getFormDataForSubmission = useCallback(() => {
    // Format time for database submission (ensure HH:MM:SS format)
    const formatTimeForDB = (timeString: string) => {
      if (!timeString) return null;
      
      // Pass through special priority values unchanged
      const specialValues = ['urgent', 'asap', 'anytime'];
      if (specialValues.includes(timeString.toLowerCase())) {
        return timeString.toLowerCase();
      }
      
      // If already in HH:MM:SS format, return as is
      if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeString;
      }
      
      // If in HH:MM format, add seconds
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        return `${timeString}:00`;
      }
      
      return timeString;
    };

    const current = formDataRef.current;
    return {
      ...current,
      delivery_time: formatTimeForDB(current.delivery_time),
      total_amount: parseFloat(current.total_amount) || 0
    };
  }, []);

  // Calculation breakdown for display.
  // Uses the order's stored fuel_surcharge so the breakdown matches the saved
  // record. Memoised on the exact inputs it reads, so it is computed once per
  // meaningful change instead of on every render.
  const calculationBreakdown = useMemo(() => {
    const adjustmentsNum = parseFloat(formData.adjustments) || 0;
    const isPickup = formData.delivery_method === 'pickup';
    const fuelSurcharge = isPickup ? 0 : (Number(formData.fuel_surcharge) || 0);

    if (!paymentSettings) {
      return {
        subtotal: formData.subtotal,
        adjustments: adjustmentsNum,
        deliveryFee: formData.delivery_fee,
        fuelSurcharge,
        surchargeAmount: 0,
        gstAmount: (formData.subtotal + adjustmentsNum + formData.delivery_fee + fuelSurcharge) / 11,
        totalAmount: parseFloat(formData.total_amount),
        hasSurcharge: false,
        gstIncluded: true
      };
    }

    const base = calculateOrderTotals(
      formData.subtotal,
      adjustmentsNum,
      formData.delivery_fee,
      formData.payment_method,
      paymentSettings,
      'pickup', // suppress implicit fuel surcharge from util
      1
    );

    return {
      ...base,
      fuelSurcharge,
      totalAmount: base.totalAmount + fuelSurcharge,
    };
  }, [
    formData.subtotal,
    formData.adjustments,
    formData.delivery_fee,
    formData.payment_method,
    formData.delivery_method,
    formData.fuel_surcharge,
    formData.total_amount,
    paymentSettings,
  ]);

  const getCalculationBreakdown = useCallback(() => calculationBreakdown, [calculationBreakdown]);

  // Detect a missing fuel surcharge so the UI can offer to apply it.
  const missingFuelSurchargeAmount = useMemo(() => {
    const settingsFuel = Number(paymentSettings?.fuel_surcharge) || 0;
    const stored = Number(formData.fuel_surcharge) || 0;
    if (formData.delivery_method === 'delivery' && stored === 0 && settingsFuel > 0) {
      return settingsFuel;
    }
    return 0;
  }, [paymentSettings?.fuel_surcharge, formData.fuel_surcharge, formData.delivery_method]);

  const applyMissingFuelSurcharge = useCallback(() => {
    if (missingFuelSurchargeAmount <= 0) return;
    const newTotal = calculateTotals({ fuel_surcharge: missingFuelSurchargeAmount });
    setFormData(prev => ({
      ...prev,
      fuel_surcharge: missingFuelSurchargeAmount,
      total_amount: newTotal,
    }));
  }, [missingFuelSurchargeAmount, calculateTotals]);

  return {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleDeliverySuburbChange,
    handleFormDataChange,
    handleProductsChange,
    handleSubtotalChange,
    handleContactChange,
    getFormDataForSubmission,
    getCalculationBreakdown,
    calculationBreakdown,
    paymentSettings,
    isDeliveryFeeManuallySet,
    getDeliveryFeeInfo,
    missingFuelSurchargeAmount,
    applyMissingFuelSurcharge,
  };
}
