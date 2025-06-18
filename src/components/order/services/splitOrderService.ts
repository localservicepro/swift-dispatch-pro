
import { supabase } from "@/integrations/supabase/client";
import { CreateOrderParams, OrderCreationResult } from "../types/orderTypes";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { generateOrderNumber } from "../utils/orderNumberGenerator";

export const createSplitOrder = async (orderData: CreateOrderParams): Promise<OrderCreationResult> => {
  console.log('Creating split order with data:', orderData);
  
  const {
    selectedCustomer,
    cart,
    subtotal,
    adjustments,
    deliveryFee,
    splits,
    truckType,
    truckId,
    driverId,
    specialInstructions,
    paymentMethod,
    deliveryAddress,
    sameAsBilling
  } = orderData;

  const masterOrderNumber = await generateOrderNumber();
  const createdOrders: string[] = [];

  // Calculate totals with GST and surcharge
  const { totalAmount } = await calculateOrderTotals(
    subtotal, adjustments, deliveryFee, paymentMethod
  );

  try {
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;

      // Prepare clean product data for JSON storage
      const cleanProducts = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const orderInsertData = {
        order_number: splitOrderNumber,
        customer_id: selectedCustomer.id,
        customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customer_address: selectedCustomer.full_address,
        customer_phone: selectedCustomer.phone,
        products: cleanProducts,
        subtotal,
        adjustments,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        delivery_date: split.deliveryDate,
        delivery_time: split.deliveryTime,
        truck_type: truckType !== "" ? truckType : null,
        truck_id: truckId === 'none' ? null : truckId,
        driver_id: driverId === 'unassigned' ? null : driverId,
        special_instructions: specialInstructions || null,
        payment_method: paymentMethod,
        is_split_order: true,
        master_order_id: masterOrderNumber,
        split_number: i + 1,
        status: 'preparing' as const,
        delivery_address: sameAsBilling ? selectedCustomer.full_address : (deliveryAddress || selectedCustomer.full_address),
        same_as_billing: sameAsBilling
      };

      console.log(`Creating split order ${i + 1}:`, orderInsertData);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single();

      if (orderError) {
        console.error(`Error creating split order ${i + 1}:`, orderError);
        throw new Error(`Failed to create split order ${i + 1}: ${orderError.message}`);
      }

      createdOrders.push(order.id);

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        price_adjustment: 0,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error(`Error creating order items for split order ${i + 1}:`, itemsError);
        // Log but don't fail - the main order was created successfully
      }
    }

    console.log(`Split order created successfully: ${masterOrderNumber}`);
    return {
      type: "split",
      orderNumber: masterOrderNumber,
      orderId: masterOrderNumber,
      splitCount: splits.length
    };

  } catch (error: any) {
    console.error('Split order creation failed:', error);
    
    // Cleanup: Try to delete any orders that were created before the failure
    if (createdOrders.length > 0) {
      console.log('Cleaning up partial split order creation...');
      try {
        await supabase
          .from('orders')
          .delete()
          .in('id', createdOrders);
      } catch (cleanupError) {
        console.error('Failed to cleanup partial orders:', cleanupError);
      }
    }
    
    throw error;
  }
};
