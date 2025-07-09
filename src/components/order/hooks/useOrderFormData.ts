
import { useState, useEffect } from "react";
import { Order } from "../OrderEditFormTypes";

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
}

export function useOrderFormData(order: Order) {
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
    truck_id: order.truck_id || 'none'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDriverChange = (driverId: string) => {
    setFormData(prev => ({ ...prev, driver_id: driverId }));
  };

  const handleSuburbChange = (suburbId: string) => {
    setFormData(prev => ({ ...prev, suburb_id: suburbId }));
  };

  const handleProductsChange = (products: any[]) => {
    setFormData(prev => ({ ...prev, products }));
  };

  const handleSubtotalChange = (subtotal: number) => {
    const deliveryFee = formData.delivery_fee || 0;
    const totalAmount = subtotal + deliveryFee;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: totalAmount.toString()
    }));
  };

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

  return {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    getFormDataForSubmission,
  };
}
