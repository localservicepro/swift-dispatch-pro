
import { supabase } from "@/integrations/supabase/client";
import { OrderFormData } from "@/types/index";
import { Database } from "@/integrations/supabase/types";
import { smsService } from "@/utils/smsService";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

interface OrderCreationResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

export const orderCreationService = {
  async createOrder(orderData: OrderFormData): Promise<OrderCreationResult> {
    console.log('Creating order with data:', orderData);
    
    try {
      // Validate required fields
      if (!orderData.customer_id) {
        throw new Error('Customer ID is required');
      }

      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('Order must have at least one item');
      }

      // Clean and validate products data
      const cleanProducts = orderData.items.map(item => ({
        id: item.product_id,
        name: item.product_id, // Will be resolved from products table
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));

      console.log('Clean products:', cleanProducts);

      // Generate order number if not provided
      const orderNumber = orderData.order_number || `ORD-${Date.now()}`;

      // Get customer details for notifications
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name, phone')
        .eq('id', orderData.customer_id)
        .single();

      // Prepare order data for insertion
      const orderInsertData = {
        order_number: orderNumber,
        customer_id: orderData.customer_id,
        customer_name: orderData.customer_name || (customer ? `${customer.first_name} ${customer.last_name}` : ''),
        customer_address: orderData.customer_address || '',
        customer_phone: orderData.customer_phone || customer?.phone || null,
        products: cleanProducts,
        total_amount: orderData.total_amount,
        subtotal: orderData.subtotal || orderData.total_amount,
        delivery_fee: orderData.delivery_fee || 0,
        status: (orderData.status || 'preparing') as OrderStatus,
        payment_status: orderData.payment_status || 'pending',
        payment_method: orderData.payment_method || null,
        delivery_date: orderData.delivery_date || null,
        delivery_time: orderData.delivery_time || null,
        special_instructions: orderData.special_instructions || null,
        driver_id: orderData.driver_id === 'unassigned' ? null : orderData.driver_id,
        truck_type: orderData.truck_type && orderData.truck_type !== "" ? orderData.truck_type as TruckType : null,
        truck_id: orderData.truck_id === 'none' ? null : orderData.truck_id,
        is_split_order: orderData.is_split_order || false,
        master_order_id: orderData.master_order_id || null,
        split_number: orderData.split_number || null,
        adjustments: orderData.adjustments || 0,
        notes: orderData.notes || null
      };

      console.log('Order insert data:', orderInsertData);

      // Insert order
      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select('id')
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      if (!orderResult?.id) {
        throw new Error('Order was created but no ID was returned');
      }

      console.log('Order created successfully with ID:', orderResult.id);

      // Create order items
      if (orderData.items.length > 0) {
        const orderItems = orderData.items.map(item => ({
          order_id: orderResult.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total,
          price_adjustment: 0
        }));

        console.log('Creating order items:', orderItems);

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Order items creation error:', itemsError);
          // Don't throw here as the main order was created successfully
          console.warn('Order created but items insertion failed:', itemsError.message);
        } else {
          console.log('Order items created successfully');
        }
      }

      // Update truck status if assigned
      if (orderData.truck_id && orderData.truck_id !== 'none') {
        console.log('Updating truck status to assigned:', orderData.truck_id);
        
        const { error: truckError } = await supabase
          .from('trucks')
          .update({ status: 'assigned' })
          .eq('id', orderData.truck_id);

        if (truckError) {
          console.error('Truck status update error:', truckError);
          // Don't throw here as the order was created successfully
        } else {
          console.log('Truck status updated successfully');
        }
      }

      // Send SMS notification if customer phone is available
      if (orderInsertData.customer_phone && orderInsertData.customer_name) {
        try {
          await smsService.sendOrderConfirmation(
            orderInsertData.customer_name,
            orderInsertData.customer_phone,
            orderNumber
          );
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
          // Don't throw as order creation was successful
        }
      }

      return {
        success: true,
        orderId: orderResult.id,
        orderNumber: orderNumber
      };

    } catch (error: any) {
      console.error('Order creation service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order'
      };
    }
  },

  async createSplitOrder(splitOrderData: any): Promise<OrderCreationResult> {
    console.log('Creating split order with data:', splitOrderData);
    
    try {
      const results = [];
      
      for (const [index, split] of splitOrderData.splits.entries()) {
        const orderData: OrderFormData = {
          customer_id: splitOrderData.customer_id,
          customer_name: splitOrderData.customer_name,
          customer_address: splitOrderData.customer_address,
          payment_method: splitOrderData.payment_method,
          items: split.products.map((p: any) => ({
            product_id: p.productId,
            quantity: p.quantity,
            price: 0, // Will be calculated
            total: 0  // Will be calculated
          })),
          total_amount: 0, // Will be calculated
          status: 'preparing',
          delivery_date: split.deliveryDate,
          delivery_time: split.deliveryTime,
          special_instructions: split.specialInstructions,
          truck_type: split.truckType,
          truck_id: split.truckId,
          driver_id: split.driverId,
          is_split_order: true,
          split_number: index + 1,
          delivery_fee: index === 0 ? splitOrderData.deliveryFee : 0,
          adjustments: index === 0 ? splitOrderData.adjustments : 0,
          payment_status: 'pending'
        };

        const result = await this.createOrder(orderData);
        
        if (!result.success) {
          throw new Error(`Failed to create split order ${index + 1}: ${result.error}`);
        }

        results.push(result);

        // Set master_order_id for subsequent splits
        if (index === 0 && result.orderId) {
          orderData.master_order_id = result.orderId;
        }
      }

      console.log('All split orders created successfully');
      
      return {
        success: true,
        orderId: results[0]?.orderId,
        orderNumber: results[0]?.orderNumber
      };

    } catch (error: any) {
      console.error('Split order creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create split order'
      };
    }
  }
};
