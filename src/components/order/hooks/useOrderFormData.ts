
import { useState, useEffect, useCallback, useMemo } from "react";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  products: any;
  total_amount: number;
  status: OrderStatus;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  truck_type?: TruckType;
  truck_id?: string;
}

export interface OrderFormData {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: string;
  status: OrderStatus;
  delivery_date: string;
  delivery_time: string;
  special_instructions: string;
  driver_id: string;
  suburb_id: string;
  delivery_fee: number;
  subtotal: number;
  truck_type: TruckType | 'none';
  truck_id: string;
  products: any[];
}

export function useOrderFormData(order: Order) {
  const initialFormData = useMemo(() => ({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone || '',
    customer_address: order.customer_address,
    total_amount: order.total_amount.toString(),
    status: order.status,
    delivery_date: order.delivery_date || '',
    delivery_time: order.delivery_time || '',
    special_instructions: order.special_instructions || '',
    driver_id: order.driver_id || 'unassigned',
    suburb_id: order.suburb_id || '',
    delivery_fee: order.delivery_fee || 0,
    subtotal: order.subtotal || (order.total_amount - (order.delivery_fee || 0)),
    truck_type: (order.truck_type || 'none') as TruckType | 'none',
    truck_id: order.truck_id || 'none',
    products: Array.isArray(order.products) ? order.products : [],
  }), [order]);

  const [formData, setFormData] = useState<OrderFormData>(initialFormData);

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleDriverChange = useCallback((driverId: string) => {
    setFormData(prev => ({
      ...prev,
      driver_id: driverId
    }));
  }, []);

  const handleSuburbChange = useCallback((suburbId: string, deliveryRate: number) => {
    setFormData(prev => {
      const newTotalAmount = prev.subtotal + deliveryRate;
      return {
        ...prev,
        suburb_id: suburbId,
        delivery_fee: deliveryRate,
        total_amount: newTotalAmount.toString(),
      };
    });
  }, []);

  const handleProductsChange = useCallback((products: any[]) => {
    setFormData(prev => ({
      ...prev,
      products
    }));
  }, []);

  const handleSubtotalChange = useCallback((subtotal: number) => {
    setFormData(prev => {
      const newTotalAmount = subtotal + prev.delivery_fee;
      return {
        ...prev,
        subtotal,
        total_amount: newTotalAmount.toString()
      };
    });
  }, []);

  return {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
  };
}
