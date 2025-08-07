
import { useState, useEffect } from "react";
import { Order } from "../OrderEditFormTypes";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";
import { supabase } from "@/integrations/supabase/client";

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
    delivery_time: order.delivery_time || '',
    special_instructions: order.special_instructions || '',
    driver_id: order.driver_id || 'unassigned',
    suburb_id: order.suburb_id || '',
    delivery_suburb_id: order.delivery_suburb_id || order.suburb_id || '',
    truck_type: order.truck_type || 'none',
    truck_id: order.truck_id || 'none',
    payment_method: order.payment_method || 'cash',
    adjustments: Number(order.adjustments) || 0,
    contact_id: order.contact_id || null,
    contact_name: order.contact_name || null,
    contact_email: order.contact_email || null,
    contact_phone: order.contact_phone || null,
    delivery_method: order.delivery_method || 'delivery'
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
    const numValue = parseFloat(value) || 0;
    
    // Handle pricing fields that need recalculation
    if (field === 'delivery_fee' || field === 'adjustments') {
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
    handleDeliverySuburbChange,
    handleFormDataChange,
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
