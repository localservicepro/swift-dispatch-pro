
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CreateOrderData {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address: string;
  products: any[];
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  adjustments: number;
  payment_method: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  driver_id?: string;
  truck_type?: string;
  truck_id?: string;
  purchase_order?: string;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  delivery_method?: string;
  pickup_location_address?: string;
  pickup_location_name?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  pickup_date?: string;
  pickup_time?: string;
}

export async function createOrder(orderData: CreateOrderData) {
  try {
    console.log('Creating order with data:', orderData);

    // Generate order number
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    let orderNumber = 'ORD-001';
    if (existingOrders && existingOrders.length > 0) {
      const lastNumber = parseInt(existingOrders[0].order_number.split('-')[1]);
      orderNumber = `ORD-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Format time fields for database
    const formatTimeForDB = (timeString?: string) => {
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

    // Prepare order data with all pickup fields
    const orderPayload = {
      order_number: orderNumber,
      customer_id: orderData.customer_id,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_address: orderData.customer_address,
      delivery_address: orderData.delivery_address,
      products: orderData.products,
      total_amount: orderData.total_amount,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee,
      adjustments: orderData.adjustments,
      payment_method: orderData.payment_method,
      delivery_date: orderData.delivery_date,
      delivery_time: formatTimeForDB(orderData.delivery_time),
      special_instructions: orderData.special_instructions,
      driver_id: orderData.driver_id === 'unassigned' ? null : orderData.driver_id,
      truck_type: orderData.truck_type === 'none' ? null : orderData.truck_type,
      truck_id: orderData.truck_id === 'none' ? null : orderData.truck_id,
      purchase_order: orderData.purchase_order,
      contact_id: orderData.contact_id,
      contact_name: orderData.contact_name,
      contact_email: orderData.contact_email,
      contact_phone: orderData.contact_phone,
      delivery_method: orderData.delivery_method || 'delivery',
      // Pickup fields - ensure they're included
      pickup_location_address: orderData.pickup_location_address || null,
      pickup_location_name: orderData.pickup_location_name || null,
      pickup_contact_name: orderData.pickup_contact_name || null,
      pickup_contact_phone: orderData.pickup_contact_phone || null,
      pickup_instructions: orderData.pickup_instructions || null,
      pickup_date: orderData.pickup_date || null,
      pickup_time: formatTimeForDB(orderData.pickup_time),
      status: 'preparing'
    };

    console.log('Order payload:', orderPayload);

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    console.log('Order created successfully:', order);

    toast({
      title: "Success",
      description: `Order ${orderNumber} created successfully!`,
    });

    return order;
  } catch (error) {
    console.error('Error in createOrder:', error);
    toast({
      title: "Error",
      description: "Failed to create order. Please try again.",
      variant: "destructive",
    });
    throw error;
  }
}
