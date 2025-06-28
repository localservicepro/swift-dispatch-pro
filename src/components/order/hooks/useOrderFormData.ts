
import { useState, useEffect } from 'react';

export interface OrderFormData {
  customer_name: string;
  purchase_order: string;
  customer_phone: string;
  customer_address: string;
  products: any[];
  total_amount: string;
  subtotal: number;
  delivery_fee: number;
  status: string;
  delivery_date: string;
  delivery_time: string;
  special_instructions: string;
  driver_id: string;
  truck_type: string;
  truck_id: string;
  suburb_id: string;
}

export function useOrderFormData(initialOrder: any) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_name: initialOrder?.customer_name || '',
    purchase_order: initialOrder?.purchase_order || '',
    customer_phone: initialOrder?.customer_phone || '',
    customer_address: initialOrder?.customer_address || '',
    products: initialOrder?.products || [],
    total_amount: initialOrder?.total_amount?.toString() || '0',
    subtotal: initialOrder?.subtotal || 0,
    delivery_fee: initialOrder?.delivery_fee || 0,
    status: initialOrder?.status || 'preparing',
    delivery_date: initialOrder?.delivery_date || '',
    delivery_time: initialOrder?.delivery_time || '',
    special_instructions: initialOrder?.special_instructions || '',
    driver_id: initialOrder?.driver_id || 'unassigned',
    truck_type: initialOrder?.truck_type || 'none',
    truck_id: initialOrder?.truck_id || 'none',
    suburb_id: initialOrder?.suburb_id || '',
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
    setFormData(prev => ({ ...prev, subtotal }));
  };

  // Update form data when initial order changes
  useEffect(() => {
    if (initialOrder) {
      setFormData({
        customer_name: initialOrder.customer_name || '',
        purchase_order: initialOrder.purchase_order || '',
        customer_phone: initialOrder.customer_phone || '',
        customer_address: initialOrder.customer_address || '',
        products: initialOrder.products || [],
        total_amount: initialOrder.total_amount?.toString() || '0',
        subtotal: initialOrder.subtotal || 0,
        delivery_fee: initialOrder.delivery_fee || 0,
        status: initialOrder.status || 'preparing',
        delivery_date: initialOrder.delivery_date || '',
        delivery_time: initialOrder.delivery_time || '',
        special_instructions: initialOrder.special_instructions || '',
        driver_id: initialOrder.driver_id || 'unassigned',
        truck_type: initialOrder.truck_type || 'none',
        truck_id: initialOrder.truck_id || 'none',
        suburb_id: initialOrder.suburb_id || '',
      });
    }
  }, [initialOrder]);

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
