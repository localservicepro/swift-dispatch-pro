
import { useState, useEffect } from "react";
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
  payment_type: string;
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
    payment_type: (order as any).payment_type || 'residential',
    payment_method: order.payment_method || 'cash',
    adjustments: order.adjustments?.toString() || '0',
    contact_id: order.contact_id || null,
    contact_name: order.contact_name || null,
    contact_email: order.contact_email || null,
    contact_phone: order.contact_phone || null,
    delivery_method: order.delivery_method || 'delivery',
    fuel_surcharge: Number(order.fuel_surcharge) || 0
  });

  // Initialize products with current prices from database
  useEffect(() => {
    const initializeProductsWithPrices = async () => {
      if (!order.products || !Array.isArray(order.products) || order.products.length === 0) {
        console.log('No products to initialize for order:', order.id);
        return;
      }

      console.log('Initializing products with current prices for order:', order.id, order.products);
      
      try {
        // Get unique product IDs from the order
        const productIds = order.products
          .map(p => p.product_id)
          .filter(Boolean)
          .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

        if (productIds.length === 0) {
          console.log('No valid product IDs found in order products');
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

        console.log('Fetched current product prices:', currentProducts);

        // Update order products with current prices
        const updatedProducts = order.products.map(orderProduct => {
          const currentProduct = currentProducts?.find(p => p.id === orderProduct.product_id);
          const updatedProduct = {
            ...orderProduct,
            // Use current database price if available, fallback to order price, then 0
            price: currentProduct?.price || Number(orderProduct.unit_price) || Number(orderProduct.price) || 0,
            // Ensure quantity is a number
            quantity: Number(orderProduct.quantity) || 0
          };
          
          console.log('Updated product:', {
            original: orderProduct,
            current: currentProduct,
            updated: updatedProduct
          });
          
          return updatedProduct;
        });

        // Calculate initial subtotal
        const initialSubtotal = updatedProducts.reduce((sum, product) => {
          return sum + (Number(product.price) * Number(product.quantity));
        }, 0);

        console.log('Initial subtotal calculated:', initialSubtotal);

        // Update form data with corrected products and subtotal
        setFormData(prev => {
          const updated = {
            ...prev,
            products: updatedProducts,
            subtotal: initialSubtotal
          };
          console.log('Form data updated with products and subtotal:', updated);
          return updated;
        });

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
  const calculateTotals = (updatedData: Partial<OrderFormData>) => {
    const currentData = { ...formData, ...updatedData };

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
  };

  const handleInputChange = (field: string, value: string) => {
    // Handle pricing fields that need recalculation — fold total into a single setState.
    if (field === 'delivery_fee') {
      let numValue = 0;
      if (value !== '' && value !== '-') {
        const parsed = parseFloat(value);
        numValue = isNaN(parsed) ? 0 : parsed;
      }
      setFormData(prev => ({
        ...prev,
        delivery_fee: numValue,
        total_amount: calculateTotals({ delivery_fee: numValue }),
      }));
    } else if (field === 'adjustments') {
      setFormData(prev => ({
        ...prev,
        adjustments: value,
        total_amount: calculateTotals({ adjustments: value }),
      }));
    } else if (field === 'payment_method') {
      setFormData(prev => ({
        ...prev,
        payment_method: value,
        total_amount: calculateTotals({ payment_method: value }),
      }));
    } else if (field === 'delivery_method') {
      if (value === 'pickup') {
        const updates = { delivery_method: value, fuel_surcharge: 0, delivery_fee: 0 };
        setFormData(prev => ({
          ...prev,
          ...updates,
          total_amount: calculateTotals(updates),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          delivery_method: value,
          total_amount: calculateTotals({ delivery_method: value }),
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDriverChange = (driverId: string) => {
    setFormData(prev => ({ ...prev, driver_id: driverId }));
  };

  const handleSuburbChange = (suburbId: string, suburb?: any) => {
    console.log('Suburb change - suburbId:', suburbId, 'suburb:', suburb);
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
  };

  const handleDeliverySuburbChange = (suburbId: string, suburb?: any) => {
    console.log('Delivery suburb change - suburbId:', suburbId, 'suburb:', suburb);
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
  };

  const handleFormDataChange = (updates: Partial<OrderFormData>) => {
    console.log('Form data change:', updates);
    // Apply pickup-method gating so toggling via this path also strips surcharge/fee.
    if (updates.delivery_method === 'pickup') {
      const merged = { ...updates, fuel_surcharge: 0, delivery_fee: 0 };
      const newTotal = calculateTotals(merged);
      setFormData(prev => ({ ...prev, ...merged, total_amount: newTotal }));
      return;
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleProductsChange = (products: any[]) => {
    setFormData(prev => ({ ...prev, products }));
  };

  const handleSubtotalChange = (subtotal: number) => {
    const updatedData = { subtotal };
    const newTotal = calculateTotals(updatedData);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: newTotal
    }));
  };

  const handleContactChange = (contactData: {
    contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }) => {
    setFormData(prev => ({
      ...prev,
      ...contactData
    }));
  };

  // Recalculate totals when payment settings *values* change (not object identity).
  // Depending on the query object caused a re-render + setState every time react-query
  // returned a new reference (refetch, focus, cache tick), which made the dialog feel
  // like it was recalculating every half-second.
  const settingsSignature = paymentSettings
    ? `${paymentSettings.gst_rate}|${paymentSettings.service_charge_rate}|${paymentSettings.fuel_surcharge}|${paymentSettings.gst_enabled}|${paymentSettings.include_gst_in_prices}`
    : '';
  useEffect(() => {
    if (!paymentSettings) return;
    const newTotal = calculateTotals({});
    setFormData(prev => (
      prev.total_amount === newTotal ? prev : { ...prev, total_amount: newTotal }
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsSignature]);

  const getFormDataForSubmission = () => {
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

    return {
      ...formData,
      delivery_time: formatTimeForDB(formData.delivery_time),
      total_amount: parseFloat(formData.total_amount) || 0
    };
  };

  // Get calculation breakdown for display.
  // Uses the order's stored fuel_surcharge so the breakdown matches the saved record.
  const getCalculationBreakdown = () => {
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
  };

  // Detect a missing fuel surcharge so the UI can offer to apply it.
  const missingFuelSurchargeAmount = (() => {
    const settingsFuel = Number(paymentSettings?.fuel_surcharge) || 0;
    const stored = Number(formData.fuel_surcharge) || 0;
    if (formData.delivery_method === 'delivery' && stored === 0 && settingsFuel > 0) {
      return settingsFuel;
    }
    return 0;
  })();

  const applyMissingFuelSurcharge = () => {
    if (missingFuelSurchargeAmount <= 0) return;
    const newTotal = calculateTotals({ fuel_surcharge: missingFuelSurchargeAmount });
    setFormData(prev => ({
      ...prev,
      fuel_surcharge: missingFuelSurchargeAmount,
      total_amount: newTotal,
    }));
  };

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
    paymentSettings,
    isDeliveryFeeManuallySet,
    getDeliveryFeeInfo,
    missingFuelSurchargeAmount,
    applyMissingFuelSurcharge,
  };
}
