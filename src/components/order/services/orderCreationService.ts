import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { OrderFormData, OrderItem, SplitOrderData } from "@/types";
import { ghlService } from "@/utils/ghlService";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderWithItems {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  status: OrderStatus;
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

  async createSplitOrder(splitOrderData: SplitOrderData): Promise<OrderWithItems[]> {
    const { customer_id, customer_name, customer_address, payment_method, splits, adjustments, deliveryFee } = splitOrderData;

    console.log('Creating split order with data:', splitOrderData);

    // Get product details for all splits to calculate totals properly
    const allProductIds = splits.flatMap(split => split.products.map(p => p.productId));
    const uniqueProductIds = [...new Set(allProductIds)];
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', uniqueProductIds);

    if (productsError) {
      console.error('Failed to fetch products:', productsError);
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      throw new Error('No products found for split order');
    }

    // Calculate total amount across all splits using actual product prices
    const totalAmount = splits.reduce((total, split) => {
      const splitTotal = split.products.reduce((splitSum, product) => {
        const productData = products.find(p => p.id === product.productId);
        if (!productData) {
          throw new Error(`Product not found: ${product.productId}`);
        }
        return splitSum + (product.quantity * productData.price);
      }, 0);
      return total + splitTotal;
    }, 0) + adjustments + deliveryFee;

    const masterOrderId = uuidv4();
    const masterOrderNumber = `SPLIT-${Date.now()}`;

    try {
      // Create master order
      const masterOrderData = {
        id: masterOrderId,
        customer_id,
        order_number: masterOrderNumber,
        customer_name,
        delivery_date: splits[0]?.deliveryDate || new Date().toISOString().split('T')[0],
        customer_address,
        total_amount: totalAmount,
        payment_status: 'pending',
        status: 'requested' as OrderStatus,
        special_instructions: `Split order with ${splits.length} parts`,
        products: JSON.stringify([]),
        is_split_order: true,
        payment_method,
        subtotal: totalAmount - adjustments - deliveryFee,
        adjustments,
        delivery_fee: deliveryFee,
        created_at: new Date().toISOString(),
      };

      console.log('Creating master order:', masterOrderData);

      const { data: masterOrder, error: masterError } = await supabase
        .from('orders')
        .insert(masterOrderData)
        .select()
        .single();

      if (masterError) {
        console.error('Failed to create master order:', masterError);
        throw new Error(`Failed to create master order: ${masterError.message}`);
      }

      console.log('Master order created successfully:', masterOrder);

      // Create individual split orders
      const splitOrders: OrderWithItems[] = [];
      
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const splitOrderId = uuidv4();
        const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;

        console.log(`Creating split ${i + 1}:`, split);

        // Calculate split total using actual product prices
        const splitItems = split.products.map(splitProduct => {
          const product = products.find(p => p.id === splitProduct.productId);
          if (!product) {
            throw new Error(`Product not found: ${splitProduct.productId}`);
          }
          return {
            product_id: splitProduct.productId,
            quantity: splitProduct.quantity,
            price: product.price,
            total: splitProduct.quantity * product.price,
          };
        });

        const splitTotal = splitItems.reduce((sum, item) => sum + item.total, 0);
        
        // Proportionally distribute adjustments and delivery fee
        const splitAdjustments = totalAmount > 0 ? (adjustments * splitTotal) / (totalAmount - adjustments - deliveryFee) : 0;
        const splitDeliveryFee = i === 0 ? deliveryFee : 0; // Only charge delivery fee for first split

        const splitOrderData = {
          id: splitOrderId,
          customer_id,
          order_number: splitOrderNumber,
          customer_name,
          delivery_date: split.deliveryDate,
          delivery_time: split.deliveryTime,
          customer_address,
          total_amount: splitTotal + splitAdjustments + splitDeliveryFee,
          payment_status: 'pending',
          status: 'requested' as OrderStatus,
          special_instructions: split.specialInstructions || `Split ${i + 1} of ${splits.length}`,
          products: JSON.stringify(splitItems),
          is_split_order: true,
          master_order_id: masterOrderId,
          split_number: i + 1,
          truck_type: split.truckType,
          truck_id: split.truckId,
          driver_id: split.driverId || null,
          subtotal: splitTotal,
          adjustments: splitAdjustments,
          delivery_fee: splitDeliveryFee,
          payment_method,
          created_at: new Date().toISOString(),
        };

        console.log(`Creating split order ${i + 1}:`, splitOrderData);

        const { data: splitOrder, error: splitError } = await supabase
          .from('orders')
          .insert(splitOrderData)
          .select()
          .single();

        if (splitError) {
          console.error(`Failed to create split order ${i + 1}:`, splitError);
          throw new Error(`Failed to create split order ${i + 1}: ${splitError.message}`);
        }

        console.log(`Split order ${i + 1} created successfully:`, splitOrder);

        // Create order items for this split
        const orderItems = await this.createOrderItems(splitOrderId, splitItems);

        splitOrders.push({
          ...splitOrder,
          order_items: orderItems,
        } as OrderWithItems);
      }

      // Try to sync to GoHighLevel
      try {
        const settings = await ghlService.getSettings();
        if (settings.auto_sync_orders && settings.connection_status === 'connected') {
          // Sync master order to GHL
          await ghlService.syncOrder(masterOrder as OrderWithItems);
          console.log('Split order synced to GHL successfully');
        }
      } catch (ghlError) {
        console.error('Failed to sync split order to GHL:', ghlError);
        // Don't fail the order creation if GHL sync fails
      }

      console.log('Split order creation completed successfully:', splitOrders);
      return splitOrders;
    } catch (error) {
      console.error("Error creating split order:", error);
      throw error;
    }
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
      customer_name: formData.customer_name || 'Customer',
      delivery_date: formData.delivery_date,
      customer_address: formData.customer_address,
      total_amount: formData.total_amount,
      payment_status: formData.payment_status,
      status: formData.status as OrderStatus,
      notes: formData.notes,
      products: JSON.stringify(formData.items),
      truck_type: formData.truck_type,
      truck_id: formData.truck_id,
      driver_id: formData.driver_id,
      delivery_time: formData.delivery_time,
      special_instructions: formData.special_instructions,
      payment_method: formData.payment_method,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: newOrderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
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
      status: formData.status as OrderStatus,
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
