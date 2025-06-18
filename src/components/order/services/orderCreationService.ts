
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { chargeCardOnFile } from "./cardOnFileService";
import { emailService } from "@/utils/emailService";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type OrderType = "single" | "split";
type TruckType = "small" | "medium" | "large" | "crane";
type DeliveryMethod = "delivery" | "pickup";

interface Split {
  deliveryDate: string;
  deliveryTime: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
}

interface CreateOrderParams {
  selectedCustomer: Customer;
  cart: Product[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: DeliveryMethod;
  orderType: OrderType;
  splits: Split[];
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
}

interface OrderCreationResult {
  type: OrderType;
  orderNumber: string;
  orderId: string;
  splitCount?: number;
}

const generateOrderNumber = async (): Promise<string> => {
  const newUuid = uuidv4();
  const shortUuid = newUuid.substring(0, 8);
  return `ORD-${shortUuid.toUpperCase()}`;
};

const validateOrderData = (orderData: CreateOrderParams): void => {
  console.log('Validating order data:', orderData);
  
  if (!orderData.selectedCustomer) {
    throw new Error('Customer is required');
  }
  
  if (!orderData.cart || orderData.cart.length === 0) {
    throw new Error('Order must contain at least one product');
  }
  
  if (orderData.subtotal <= 0) {
    throw new Error('Order subtotal must be greater than 0');
  }

  if (!orderData.deliveryMethod) {
    throw new Error('Delivery method is required');
  }
  
  // Only validate delivery-specific fields for delivery orders
  if (orderData.deliveryMethod === "delivery") {
    if (orderData.truckType === "" || !orderData.truckType) {
      throw new Error('Truck type is required for delivery orders');
    }
    
    if (!orderData.truckId || orderData.truckId === 'none') {
      throw new Error('Truck selection is required for delivery orders');
    }
  }
  
  // Validate cart items
  orderData.cart.forEach((item, index) => {
    if (!item.id || !item.name) {
      throw new Error(`Invalid product at position ${index + 1}`);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product: ${item.name}`);
    }
    if (item.price === undefined || item.price < 0) {
      throw new Error(`Invalid price for product: ${item.name}`);
    }
  });
  
  console.log('Order data validation passed');
};

const createSplitOrder = async (orderData: CreateOrderParams): Promise<OrderCreationResult> => {
  console.log('Creating split order with data:', orderData);
  
  validateOrderData(orderData);
  
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

  try {
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;
      const totalAmount = subtotal + adjustments + deliveryFee;

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

export async function createOrder(orderData: CreateOrderParams): Promise<OrderCreationResult> {
  console.log('Creating order with data:', orderData);

  try {
    validateOrderData(orderData);

    const {
      selectedCustomer,
      cart,
      subtotal,
      adjustments,
      deliveryFee,
      deliveryMethod,
      orderType,
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

    if (orderType === "split") {
      return await createSplitOrder(orderData);
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();
    const totalAmount = subtotal + adjustments + deliveryFee;

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

  } catch (error: any) {
    console.error('Order creation failed:', error);
    throw new Error(error.message || 'Failed to create order');
  }
}
