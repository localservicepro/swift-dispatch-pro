
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { OrderFormData, OrderItem } from "@/types";
import { ghlService } from "@/utils/ghlService";

interface OrderWithItems {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  status: string;
  delivery_date: string;
  customer_address: string;
  payment_status: string;
  notes?: string;
  order_items?: any[];
}

export const orderCreationService = {
  async validateOrderData(formData: OrderFormData): Promise<string[]> {
    const errors: string[] = [];

    if (!formData.customer_id) {
      errors.push("Customer is required.");
    }

    if (!formData.delivery_date) {
      errors.push("Delivery date is required.");
    }

    if (!formData.customer_address) {
      errors.push("Delivery address is required.");
    }

    if (formData.items && formData.items.length === 0) {
      errors.push("At least one item is required.");
    }

    return errors;
  },

  async createOrderItems(orderId: string, items: OrderItem[]) {
    const orderItemsToInsert = items.map(item => ({
      id: uuidv4(),
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.total,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to create order items: ${error.message}`);
    }

    return data;
  },
  
  async createOrder(formData: OrderFormData): Promise<OrderWithItems> {
    const errors = await this.validateOrderData(formData);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const orderId = uuidv4();
    const orderData = {
      id: orderId,
      customer_id: formData.customer_id,
      order_number: formData.order_number || `ORD-${Date.now()}`,
      customer_name: 'Customer', // This should be populated from customer data
      delivery_date: formData.delivery_date,
      customer_address: formData.customer_address,
      total_amount: formData.total_amount,
      payment_status: formData.payment_status,
      status: formData.status,
      notes: formData.notes,
      products: JSON.stringify(formData.items),
      created_at: new Date().toISOString(),
    };

    try {
      const { data: newOrderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      const orderItems = await this.createOrderItems(orderId, formData.items);

      const newOrder = {
        ...newOrderData,
        order_items: orderItems,
      } as OrderWithItems;
      
      // After successful order creation, sync to GoHighLevel
      try {
        const settings = await ghlService.getSettings();
        if (settings.auto_sync_orders && settings.connection_status === 'connected') {
          await ghlService.syncOrder(newOrder);
          console.log('Order synced to GHL successfully');
        }
      } catch (ghlError) {
        console.error('Failed to sync order to GHL:', ghlError);
        // Don't fail the order creation if GHL sync fails
      }

      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  async updateOrder(orderId: string, formData: OrderFormData): Promise<OrderWithItems> {
    const errors = await this.validateOrderData(formData);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const orderData = {
      customer_id: formData.customer_id,
      order_number: formData.order_number,
      delivery_date: formData.delivery_date,
      customer_address: formData.customer_address,
      total_amount: formData.total_amount,
      payment_status: formData.payment_status,
      status: formData.status,
      notes: formData.notes,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: updatedOrderData, error: orderError } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to update order: ${orderError.message}`);
      }

      // Fetch existing order items
      const { data: existingOrderItems, error: fetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (fetchError) {
        throw new Error(`Failed to fetch existing order items: ${fetchError.message}`);
      }

      // Delete existing order items
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) {
        throw new Error(`Failed to delete existing order items: ${deleteError.message}`);
      }

      // Create new order items
      const orderItems = await this.createOrderItems(orderId, formData.items);

      const updatedOrder = {
        ...updatedOrderData,
        order_items: orderItems,
      } as OrderWithItems;

      return updatedOrder;
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    try {
      // Delete order items associated with the order
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteItemsError) {
        throw new Error(`Failed to delete order items: ${deleteItemsError.message}`);
      }

      // Delete the order
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (deleteOrderError) {
        throw new Error(`Failed to delete order: ${deleteOrderError.message}`);
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  },
};

// Export individual functions for backward compatibility
export const { createOrder, updateOrder, deleteOrder } = orderCreationService;
