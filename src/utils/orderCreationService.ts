
import { supabase } from "@/integrations/supabase/client";

export interface OrderData {
  order_number?: string;
  purchase_order?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address?: string;
  products: any[];
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  adjustments?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  customer_id?: string;
  delivery_date?: string;
  delivery_time?: string;
  delivery_method?: string;
  truck_type?: string;
  truck_id?: string;
  driver_id?: string;
  special_instructions?: string;
  order_notes?: string;
  delivery_notes?: string;
}

export interface SplitOrderData extends OrderData {
  split_orders: Partial<OrderData>[];
}

class OrderCreationService {
  /**
   * Create a single order using RPC function
   */
  async createSingleOrder(orderData: OrderData): Promise<string> {
    try {
      console.log('Creating single order via RPC:', orderData);

      // Prepare order data for RPC function
      const rpcOrderData = {
        order_number: orderData.order_number,
        purchase_order: orderData.purchase_order,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        delivery_address: orderData.delivery_address,
        products: JSON.stringify(orderData.products),
        total_amount: orderData.total_amount.toString(),
        subtotal: orderData.subtotal?.toString() || '0',
        delivery_fee: orderData.delivery_fee?.toString() || '0',
        adjustments: orderData.adjustments?.toString() || '0',
        status: orderData.status || 'preparing',
        payment_status: orderData.payment_status || 'pending',
        payment_method: orderData.payment_method,
        customer_id: orderData.customer_id,
        delivery_date: orderData.delivery_date,
        delivery_time: orderData.delivery_time,
        delivery_method: orderData.delivery_method || 'delivery',
        truck_type: orderData.truck_type,
        truck_id: orderData.truck_id,
        driver_id: orderData.driver_id,
        special_instructions: orderData.special_instructions,
        order_notes: orderData.order_notes,
        delivery_notes: orderData.delivery_notes
      };

      const { data: orderId, error } = await supabase.rpc('create_single_order', {
        p_order_data: rpcOrderData
      });

      if (error) {
        console.error('RPC error creating order:', error);
        throw error;
      }

      console.log('Order created successfully with ID:', orderId);
      return orderId;
    } catch (error) {
      console.error('Error in createSingleOrder:', error);
      throw error;
    }
  }

  /**
   * Create split orders using RPC function
   */
  async createSplitOrder(masterOrderData: OrderData, splitOrders: Partial<OrderData>[]): Promise<string[]> {
    try {
      console.log('Creating split orders via RPC:', { masterOrderData, splitOrders });

      // Prepare master order data
      const rpcMasterData = {
        order_number: masterOrderData.order_number,
        purchase_order: masterOrderData.purchase_order,
        customer_name: masterOrderData.customer_name,
        customer_phone: masterOrderData.customer_phone,
        customer_address: masterOrderData.customer_address,
        delivery_address: masterOrderData.delivery_address,
        products: JSON.stringify(masterOrderData.products),
        total_amount: masterOrderData.total_amount.toString(),
        subtotal: masterOrderData.subtotal?.toString() || '0',
        delivery_fee: masterOrderData.delivery_fee?.toString() || '0',
        adjustments: masterOrderData.adjustments?.toString() || '0',
        status: masterOrderData.status || 'preparing',
        payment_status: masterOrderData.payment_status || 'pending',
        payment_method: masterOrderData.payment_method,
        customer_id: masterOrderData.customer_id,
        delivery_date: masterOrderData.delivery_date,
        delivery_time: masterOrderData.delivery_time,
        delivery_method: masterOrderData.delivery_method || 'delivery',
        truck_type: masterOrderData.truck_type,
        truck_id: masterOrderData.truck_id,
        driver_id: masterOrderData.driver_id,
        special_instructions: masterOrderData.special_instructions,
        order_notes: masterOrderData.order_notes,
        delivery_notes: masterOrderData.delivery_notes
      };

      // Prepare split orders data
      const rpcSplitOrders = splitOrders.map(order => ({
        order_number: order.order_number,
        purchase_order: order.purchase_order || masterOrderData.purchase_order,
        customer_name: order.customer_name || masterOrderData.customer_name,
        customer_phone: order.customer_phone || masterOrderData.customer_phone,
        customer_address: order.customer_address || masterOrderData.customer_address,
        delivery_address: order.delivery_address || order.customer_address || masterOrderData.delivery_address,
        products: JSON.stringify(order.products || []),
        total_amount: (order.total_amount || 0).toString(),
        subtotal: (order.subtotal || 0).toString(),
        delivery_fee: (order.delivery_fee || 0).toString(),
        adjustments: (order.adjustments || 0).toString(),
        status: order.status || masterOrderData.status || 'preparing',
        payment_status: order.payment_status || masterOrderData.payment_status || 'pending',
        payment_method: order.payment_method || masterOrderData.payment_method,
        customer_id: order.customer_id || masterOrderData.customer_id,
        delivery_date: order.delivery_date || masterOrderData.delivery_date,
        delivery_time: order.delivery_time || masterOrderData.delivery_time,
        delivery_method: order.delivery_method || masterOrderData.delivery_method || 'delivery',
        truck_type: order.truck_type || masterOrderData.truck_type,
        truck_id: order.truck_id || masterOrderData.truck_id,
        driver_id: order.driver_id || masterOrderData.driver_id,
        special_instructions: order.special_instructions || masterOrderData.special_instructions,
        order_notes: order.order_notes || masterOrderData.order_notes,
        delivery_notes: order.delivery_notes || masterOrderData.delivery_notes
      }));

      const { data: orderIds, error } = await supabase.rpc('create_split_order', {
        p_master_order_data: rpcMasterData,
        p_split_orders: rpcSplitOrders
      });

      if (error) {
        console.error('RPC error creating split orders:', error);
        throw error;
      }

      console.log('Split orders created successfully with IDs:', orderIds);
      return orderIds;
    } catch (error) {
      console.error('Error in createSplitOrder:', error);
      throw error;
    }
  }

  /**
   * Generate order number
   */
  generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }
}

export const orderCreationService = new OrderCreationService();
