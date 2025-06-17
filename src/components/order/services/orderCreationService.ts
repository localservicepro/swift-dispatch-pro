
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { chargeCardOnFile } from "./cardOnFileService";
import { 
  validateUUID, 
  validateRequiredString, 
  validateOptionalString, 
  validateNumber,
  validateProductsForDatabase 
} from "@/utils/validationUtils";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

type OrderType = "single" | "split";
type TruckType = "small" | "medium" | "large" | "crane";

interface Split {
  deliveryDate: string;
  deliveryTime: string;
}

interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
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
  orderType: OrderType;
  splits: Split[];
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType;
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
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

// Validate and prepare order data for database insertion
const validateAndPrepareOrderData = (orderData: CreateOrderParams) => {
  console.log('Validating order data:', orderData);

  // Validate customer
  if (!orderData.selectedCustomer || !orderData.selectedCustomer.id) {
    throw new Error('Valid customer is required');
  }

  // Validate and clean products
  const validatedProducts = validateProductsForDatabase(orderData.cart);
  
  // Validate required fields
  const customerName = validateRequiredString(
    `${orderData.selectedCustomer.first_name} ${orderData.selectedCustomer.last_name}`,
    'Customer name'
  );
  const customerAddress = validateRequiredString(orderData.selectedCustomer.full_address, 'Customer address');
  
  // Validate and clean optional UUID fields
  const validatedTruckId = validateUUID(orderData.truckId);
  const validatedDriverId = validateUUID(orderData.driverId);
  
  // Validate numbers
  const subtotal = validateNumber(orderData.subtotal, 'Subtotal');
  const adjustments = validateNumber(orderData.adjustments, 'Adjustments');
  const deliveryFee = validateNumber(orderData.deliveryFee, 'Delivery fee');
  const totalAmount = subtotal + adjustments + deliveryFee;

  // Validate truck type
  const validTruckTypes: TruckType[] = ['small', 'medium', 'large', 'crane'];
  if (!validTruckTypes.includes(orderData.truckType)) {
    throw new Error(`Invalid truck type: ${orderData.truckType}`);
  }

  console.log('Validation successful. Validated data:', {
    customerId: orderData.selectedCustomer.id,
    customerName,
    productsCount: validatedProducts.length,
    totalAmount,
    truckId: validatedTruckId,
    driverId: validatedDriverId
  });

  return {
    validatedProducts,
    customerName,
    customerAddress,
    validatedTruckId,
    validatedDriverId,
    subtotal,
    adjustments,
    deliveryFee,
    totalAmount
  };
};

const createSplitOrder = async (orderData: CreateOrderParams): Promise<OrderCreationResult> => {
  const masterOrderNumber = await generateOrderNumber();
  let totalSplitAmount = 0;

  const {
    validatedProducts,
    customerName,
    customerAddress,
    validatedTruckId,
    validatedDriverId,
    subtotal,
    adjustments,
    deliveryFee,
    totalAmount
  } = validateAndPrepareOrderData(orderData);

  console.log(`Creating split order with master number: ${masterOrderNumber}`);

  for (let i = 0; i < orderData.splits.length; i++) {
    const split = orderData.splits[i];
    const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;
    totalSplitAmount += totalAmount;

    const orderInsertData = {
      order_number: splitOrderNumber,
      customer_id: orderData.selectedCustomer.id,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_phone: validateOptionalString(orderData.selectedCustomer.phone),
      products: validatedProducts,
      subtotal,
      adjustments,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      delivery_date: validateRequiredString(split.deliveryDate, 'Delivery date'),
      delivery_time: validateRequiredString(split.deliveryTime, 'Delivery time'),
      truck_type: orderData.truckType,
      truck_id: validatedTruckId,
      driver_id: validatedDriverId,
      special_instructions: validateOptionalString(orderData.specialInstructions),
      payment_method: validateRequiredString(orderData.paymentMethod, 'Payment method'),
      is_split_order: true,
      master_order_id: masterOrderNumber,
      split_number: i + 1,
      status: 'preparing' as const,
    };

    console.log(`Inserting split order ${i + 1}:`, orderInsertData);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error(`Error creating split order ${i + 1}:`, orderError);
      throw new Error(`Failed to create split order ${i + 1}: ${orderError.message}`);
    }

    console.log(`Split order ${i + 1} created successfully:`, order);

    const orderItems = validatedProducts.map((item) => ({
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
      // Log but don't fail the entire operation
    }
  }

  console.log(`Split order creation completed. Master order: ${masterOrderNumber}`);

  return {
    type: "split",
    orderNumber: masterOrderNumber,
    orderId: masterOrderNumber,
    splitCount: orderData.splits.length
  };
};

export async function createOrder(orderData: CreateOrderParams): Promise<OrderCreationResult> {
  console.log('Starting order creation process:', {
    orderType: orderData.orderType,
    customerName: `${orderData.selectedCustomer.first_name} ${orderData.selectedCustomer.last_name}`,
    productCount: orderData.cart.length,
    totalAmount: orderData.subtotal + orderData.adjustments + orderData.deliveryFee
  });

  try {
    if (orderData.orderType === "split") {
      return await createSplitOrder(orderData);
    }

    // Validate and prepare single order data
    const {
      validatedProducts,
      customerName,
      customerAddress,
      validatedTruckId,
      validatedDriverId,
      subtotal,
      adjustments,
      deliveryFee,
      totalAmount
    } = validateAndPrepareOrderData(orderData);

    // Generate order number
    const orderNumber = await generateOrderNumber();
    console.log(`Creating single order with number: ${orderNumber}`);

    // Create order data
    const orderInsertData = {
      order_number: orderNumber,
      customer_id: orderData.selectedCustomer.id,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_phone: validateOptionalString(orderData.selectedCustomer.phone),
      products: validatedProducts,
      subtotal,
      adjustments,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      delivery_date: validateRequiredString(orderData.deliveryDate, 'Delivery date'),
      delivery_time: validateRequiredString(orderData.deliveryTime, 'Delivery time'),
      truck_type: orderData.truckType,
      truck_id: validatedTruckId,
      driver_id: validatedDriverId,
      special_instructions: validateOptionalString(orderData.specialInstructions),
      payment_method: validateRequiredString(orderData.paymentMethod, 'Payment method'),
      status: 'preparing' as const,
    };

    console.log('Inserting single order:', orderInsertData);

    // Insert the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating single order:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Single order created successfully:', order);

    // Handle card on file payment
    if (orderData.paymentMethod === 'card_on_file') {
      try {
        console.log('Processing card on file payment...');
        const paymentResult = await chargeCardOnFile({
          customerId: orderData.selectedCustomer.id,
          amount: totalAmount,
          orderNumber: orderNumber,
          description: `Order ${orderNumber} - ${customerName}`
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
    const orderItems = validatedProducts.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      price_adjustment: 0,
    }));

    console.log('Creating order items:', orderItems);

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Don't throw here as the main order was created
    }

    console.log(`Order creation completed successfully. Order number: ${orderNumber}`);

    return {
      type: 'single',
      orderNumber,
      orderId: order.id
    };

  } catch (error: any) {
    console.error('Order creation failed:', {
      error: error,
      message: error?.message,
      orderData: {
        orderType: orderData.orderType,
        customerId: orderData.selectedCustomer?.id,
        productCount: orderData.cart?.length
      }
    });
    
    // Re-throw with a more specific error message
    throw new Error(error.message || 'Failed to create order due to validation or database error');
  }
}
