
import { supabase } from "@/integrations/supabase/client";
import { Customer, CartItem } from "../types";
import { calculateOrderTotals } from "../utils/paymentCalculations";

interface CreateOrderParams {
  selectedCustomer: Customer;
  cart: { id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: "delivery" | "pickup";
  orderType: "single" | "split";
  splits: any[];
  deliveryDate: string;
  deliveryTime: string;
  truckType: string;
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
}

export async function createOrder(params: CreateOrderParams) {
  console.log('Creating order with params:', params);

  // Fetch current payment settings for calculations
  const { data: paymentSettings } = await supabase
    .from('payment_settings')
    .select('*')
    .single();

  if (!paymentSettings) {
    throw new Error('Payment settings not found. Please configure payment settings first.');
  }

  // Calculate order totals with current settings
  const orderTotals = calculateOrderTotals(
    params.subtotal,
    params.adjustments,
    params.deliveryFee,
    params.paymentMethod,
    paymentSettings
  );

  console.log('Calculated order totals:', orderTotals);

  if (params.orderType === "single") {
    return await createSingleOrder(params, orderTotals, paymentSettings);
  } else {
    return await createSplitOrder(params, orderTotals, paymentSettings);
  }
}

async function createSingleOrder(params: CreateOrderParams, orderTotals: any, paymentSettings: any) {
  // Generate unique order number
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const orderData = {
    order_number: orderNumber,
    customer_id: params.selectedCustomer.id,
    customer_name: `${params.selectedCustomer.first_name} ${params.selectedCustomer.last_name}`,
    customer_phone: params.selectedCustomer.phone,
    customer_address: params.sameAsBilling ? params.selectedCustomer.full_address : params.deliveryAddress,
    delivery_address: params.sameAsBilling ? params.selectedCustomer.full_address : params.deliveryAddress,
    same_as_billing: params.sameAsBilling,
    products: params.cart,
    subtotal: orderTotals.subtotal,
    adjustments: orderTotals.adjustments,
    delivery_fee: orderTotals.deliveryFee,
    total_amount: orderTotals.totalAmount,
    delivery_method: params.deliveryMethod,
    delivery_date: params.deliveryDate || null,
    delivery_time: params.deliveryTime || null,
    truck_type: params.truckType || null,
    truck_id: params.truckId || null,
    driver_id: params.driverId || null,
    special_instructions: params.specialInstructions,
    payment_method: params.paymentMethod,
    status: 'preparing' as const,
    is_split_order: false,
    // Store surcharge and GST amounts as metadata
    payment_status: 'pending'
  };

  console.log('Creating single order with data:', orderData);

  const { data: order, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }

  console.log('Single order created successfully:', order);

  return {
    type: 'single' as const,
    orderNumber: order.order_number,
    orderId: order.id
  };
}

async function createSplitOrder(params: CreateOrderParams, orderTotals: any, paymentSettings: any) {
  const masterOrderNumber = `SPL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orders = [];

  // Create master order entry
  const masterOrderData = {
    order_number: masterOrderNumber,
    customer_id: params.selectedCustomer.id,
    customer_name: `${params.selectedCustomer.first_name} ${params.selectedCustomer.last_name}`,
    customer_phone: params.selectedCustomer.phone,
    customer_address: params.sameAsBilling ? params.selectedCustomer.full_address : params.deliveryAddress,
    delivery_address: params.sameAsBilling ? params.selectedCustomer.full_address : params.deliveryAddress,
    same_as_billing: params.sameAsBilling,
    products: params.cart,
    subtotal: orderTotals.subtotal,
    adjustments: orderTotals.adjustments,
    delivery_fee: orderTotals.deliveryFee,
    total_amount: orderTotals.totalAmount,
    delivery_method: params.deliveryMethod,
    payment_method: params.paymentMethod,
    status: 'preparing' as const,
    is_split_order: true,
    master_order_id: null,
    split_number: 0,
    payment_status: 'pending'
  };

  const { data: masterOrder, error: masterError } = await supabase
    .from('orders')
    .insert([masterOrderData])
    .select()
    .single();

  if (masterError) {
    console.error('Error creating master order:', masterError);
    throw new Error(`Failed to create master order: ${masterError.message}`);
  }

  orders.push(masterOrder);

  // Create individual split orders
  for (let i = 0; i < params.splits.length; i++) {
    const split = params.splits[i];
    const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;
    
    // Calculate split totals proportionally
    const splitSubtotal = split.products.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
    const splitTotals = calculateOrderTotals(
      splitSubtotal,
      0, // No adjustments on splits
      split.deliveryFee || 0,
      params.paymentMethod,
      paymentSettings
    );

    const splitOrderData = {
      order_number: splitOrderNumber,
      customer_id: params.selectedCustomer.id,
      customer_name: `${params.selectedCustomer.first_name} ${params.selectedCustomer.last_name}`,
      customer_phone: params.selectedCustomer.phone,
      customer_address: split.deliveryAddress,
      delivery_address: split.deliveryAddress,
      same_as_billing: false,
      products: split.products,
      subtotal: splitTotals.subtotal,
      adjustments: 0,
      delivery_fee: splitTotals.deliveryFee,
      total_amount: splitTotals.totalAmount,
      delivery_method: params.deliveryMethod,
      delivery_date: split.deliveryDate,
      delivery_time: split.deliveryTime,
      truck_type: split.truckType,
      truck_id: split.truckId,
      driver_id: split.driverId,
      special_instructions: split.specialInstructions,
      payment_method: params.paymentMethod,
      status: 'preparing' as const,
      is_split_order: true,
      master_order_id: masterOrder.id,
      split_number: i + 1,
      payment_status: 'pending'
    };

    const { data: splitOrder, error: splitError } = await supabase
      .from('orders')
      .insert([splitOrderData])
      .select()
      .single();

    if (splitError) {
      console.error(`Error creating split order ${i + 1}:`, splitError);
      throw new Error(`Failed to create split order ${i + 1}: ${splitError.message}`);
    }

    orders.push(splitOrder);
  }

  console.log('Split orders created successfully:', orders);

  return {
    type: 'split' as const,
    orderNumber: masterOrderNumber,
    splitCount: params.splits.length,
    orders
  };
}
