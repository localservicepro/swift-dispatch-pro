
import { supabase } from "@/integrations/supabase/client";
import { chargeCardOnFile } from "./cardOnFileService";
import { emailService } from "@/utils/emailService";
import { CreateOrderParams, OrderCreationResult } from "../types/orderTypes";
import { calculateOrderTotals } from "../utils/paymentCalculations";
import { generateOrderNumber } from "../utils/orderNumberGenerator";

export const createSingleOrder = async (orderData: CreateOrderParams): Promise<OrderCreationResult> => {
  console.log('Creating single order with data:', orderData);

  const {
    selectedCustomer,
    cart,
    subtotal,
    adjustments,
    deliveryFee,
    deliveryMethod,
    deliveryDate,
    deliveryTime,
    truckType,
    truckId,
    driverId,
    specialInstructions,
    paymentMethod,
    deliveryAddress,
    sameAsBilling
  } = orderData;

  // Generate order number
  const orderNumber = await generateOrderNumber();
  
  // Calculate totals with GST and surcharge
  const { totalAmount } = await calculateOrderTotals(
    subtotal, adjustments, deliveryFee, paymentMethod
  );

  // Prepare clean product data for JSON storage
  const cleanProducts = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));

  // Create order data with proper null handling for pickup orders
  const orderInsertData = {
    order_number: orderNumber,
    customer_id: selectedCustomer.id,
    customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
    customer_address: selectedCustomer.full_address,
    customer_phone: selectedCustomer.phone,
    products: cleanProducts,
    subtotal,
    adjustments,
    delivery_fee: deliveryFee,
    total_amount: totalAmount,
    delivery_method: deliveryMethod,
    delivery_date: deliveryMethod === "pickup" ? null : (deliveryDate || null),
    delivery_time: deliveryMethod === "pickup" ? null : (deliveryTime || null),
    truck_type: deliveryMethod === "pickup" ? null : (truckType !== "" ? truckType : null),
    truck_id: deliveryMethod === "pickup" ? null : (truckId === 'none' ? null : truckId),
    driver_id: deliveryMethod === "pickup" ? null : (driverId === 'unassigned' ? null : driverId),
    special_instructions: specialInstructions || null,
    payment_method: paymentMethod,
    status: 'preparing' as const,
    delivery_address: sameAsBilling ? selectedCustomer.full_address : (deliveryAddress || selectedCustomer.full_address),
    same_as_billing: sameAsBilling
  };

  console.log('Inserting order:', orderInsertData);

  // Insert the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderInsertData)
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError);
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  console.log('Order created successfully:', order);

  // Handle card on file payment
  if (paymentMethod === 'card_on_file') {
    try {
      console.log('Processing card on file payment...');
      const paymentResult = await chargeCardOnFile({
        customerId: selectedCustomer.id,
        amount: totalAmount,
        orderNumber: orderNumber,
        description: `Order ${orderNumber} - ${selectedCustomer.first_name} ${selectedCustomer.last_name}`
      });

      console.log('Card on file payment result:', paymentResult);

      // Update order with payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order payment status:', updateError);
        // Don't throw here as the order was created successfully
      }
    } catch (paymentError: any) {
      console.error('Card on file payment failed:', paymentError);
      
      // Update order with failed payment status
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed'
        })
        .eq('id', order.id);

      throw new Error(`Order created but payment failed: ${paymentError.message}`);
    }
  }

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
    console.error('Error creating order items:', itemsError);
    // Log but don't fail - the main order was created successfully
  }

  // Send order confirmation email if customer has email
  try {
    if (selectedCustomer.email) {
      await emailService.sendOrderConfirmation({
        customerName: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        customerEmail: selectedCustomer.email,
        orderNumber: orderNumber,
        orderItems: cleanProducts.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: totalAmount,
        deliveryAddress: selectedCustomer.full_address,
        deliveryDate: deliveryMethod === "pickup" ? "" : deliveryDate,
        deliveryTime: deliveryMethod === "pickup" ? "" : deliveryTime,
        specialInstructions: specialInstructions
      });
    }
  } catch (emailError) {
    console.error('Failed to send order confirmation email:', emailError);
    // Don't fail the order creation if email fails
  }

  return {
    type: 'single',
    orderNumber,
    orderId: order.id
  };
};
