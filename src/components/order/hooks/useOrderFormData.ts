
import { useState, useEffect } from "react";
import { Order } from "../OrderEditFormTypes";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";

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
  special_instructions: string;
  driver_id: string;
  suburb_id: string;
  delivery_suburb_id: string;
  truck_type: string;
  truck_id: string;
  payment_method: string;
  adjustments: number;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  delivery_method: string;
  pickup_location_address?: string;
  pickup_location_name?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  pickup_date?: string;
  pickup_time?: string;
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
    subtotal: order.subtotal || 0,
    delivery_fee: order.delivery_fee || 0,
    status: order.status || 'preparing',
    delivery_date: order.delivery_date || '',
    delivery_time: order.delivery_time || '',
    special_instructions: order.special_instructions || '',
    driver_id: order.driver_id || 'unassigned',
    suburb_id: order.suburb_id || '',
    delivery_suburb_id: order.delivery_suburb_id || '',
    truck_type: order.truck_type || 'none',
    truck_id: order.truck_id || 'none',
    payment_method: order.payment_method || 'cash',
    adjustments: order.adjustments || 0,
    contact_id: order.contact_id || null,
    contact_name: order.contact_name || null,
    contact_email: order.contact_email || null,
    contact_phone: order.contact_phone || null,
    delivery_method: order.delivery_method || 'delivery',
    pickup_location_address: order.pickup_location_address || '',
    pickup_location_name: order.pickup_location_name || '',
    pickup_contact_name: order.pickup_contact_name || '',
    pickup_contact_phone: order.pickup_contact_phone || '',
    pickup_instructions: order.pickup_instructions || '',
    pickup_date: order.pickup_date || '',
    pickup_time: order.pickup_time || ''
  });

  // Calculate totals whenever pricing components change
  const calculateTotals = (updatedData: Partial<OrderFormData>) => {
    const currentData = { ...formData, ...updatedData };
    
    if (!paymentSettings) {
      // Fallback calculation without payment settings
      const total = currentData.subtotal + currentData.delivery_fee + currentData.adjustments;
      return total.toFixed(2);
    }

    const orderTotals = calculateOrderTotals(
      currentData.subtotal,
      currentData.adjustments,
      currentData.delivery_fee,
      currentData.payment_method,
      paymentSettings
    );

    console.log('Order totals calculated:', orderTotals);
    return orderTotals.totalAmount.toFixed(2);
  };

  const handleInputChange = (field: string, value: string) => {
    // Handle numeric fields that need recalculation
    if (field === 'subtotal' || field === 'delivery_fee' || field === 'adjustments') {
      const numValue = parseFloat(value) || 0;
      const updatedData = { [field]: numValue };
      const newTotal = calculateTotals(updatedData);
      
      setFormData(prev => ({
        ...prev,
        [field]: numValue,
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
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleDriverChange = (driverId: string) => {
    setFormData(prev => ({ ...prev, driver_id: driverId }));
  };

  const handleSuburbChange = (suburbId: string, suburb?: any) => {
    setFormData(prev => ({ 
      ...prev, 
      suburb_id: suburbId,
      delivery_suburb_id: suburbId 
    }));
    
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

  // Recalculate totals when payment settings are loaded
  useEffect(() => {
    if (paymentSettings) {
      const newTotal = calculateTotals({});
      setFormData(prev => ({
        ...prev,
        total_amount: newTotal
      }));
    }
  }, [paymentSettings]);

  const getFormDataForSubmission = () => {
    // Format time for database submission (ensure HH:MM:SS format)
    const formatTimeForDB = (timeString: string) => {
      if (!timeString) return null;
      
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
      pickup_time: formatTimeForDB(formData.pickup_time || ''),
      total_amount: parseFloat(formData.total_amount) || 0
    };
  };

  // Get calculation breakdown for display
  const getCalculationBreakdown = () => {
    if (!paymentSettings) {
      return {
        subtotal: formData.subtotal,
        adjustments: formData.adjustments,
        deliveryFee: formData.delivery_fee,
        surchargeAmount: 0,
        gstAmount: (formData.subtotal + formData.adjustments + formData.delivery_fee) * 0.1,
        totalAmount: parseFloat(formData.total_amount),
        hasSurcharge: false
      };
    }

    return calculateOrderTotals(
      formData.subtotal,
      formData.adjustments,
      formData.delivery_fee,
      formData.payment_method,
      paymentSettings
    );
  };

  return {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    handleContactChange,
    getFormDataForSubmission,
    getCalculationBreakdown,
    paymentSettings,
    isDeliveryFeeManuallySet,
    getDeliveryFeeInfo
  };
}
