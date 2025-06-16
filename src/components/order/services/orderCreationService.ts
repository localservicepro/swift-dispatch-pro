import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Customer, CartItem, SplitConfig, TruckType } from "../types";

export interface CreateOrderParams {
  selectedCustomer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  orderType: "single" | "split";
  splits: SplitConfig[];
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
}

export interface SingleOrderResult {
  orderNumber: string;
  type: 'single';
}

export interface SplitOrderResult {
  orderNumber: string;
  type: 'split';
  splitCount: number;
}

export type OrderCreationResult = SingleOrderResult | SplitOrderResult;

export async function createOrder(params: CreateOrderParams): Promise<OrderCreationResult> {
  const {
    selectedCustomer,
    cart,
    subtotal,
    adjustments,
    deliveryFee,
    orderType,
    splits,
    deliveryDate,
    deliveryTime,
    truckType,
    truckId,
    driverId,
    specialInstructions,
    paymentMethod
  } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  if (orderType === "single") {
    return await createSingleOrder({
      selectedCustomer,
      cart,
      subtotal,
      adjustments,
      deliveryFee,
      deliveryDate,
      deliveryTime,
      truckType,
      truckId,
      driverId,
      specialInstructions,
      paymentMethod,
      userId: user.id
    });
  } else {
    return await createSplitOrder({
      selectedCustomer,
      cart,
      subtotal,
      adjustments,
      deliveryFee,
      splits,
      paymentMethod,
      userId: user.id
    });
  }
}

async function createSingleOrder(params: {
  selectedCustomer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
  userId: string;
}): Promise<SingleOrderResult> {
  const {
    selectedCustomer,
    cart,
    subtotal,
    adjustments,
    deliveryFee,
    deliveryDate,
    deliveryTime,
    truckType,
    truckId,
    driverId,
    specialInstructions,
    paymentMethod,
    userId
  } = params;

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  let paymentStatus = 'pending';
  if (paymentMethod === 'account') {
    paymentStatus = 'account_billing';
  } else if (paymentMethod === '7_day_invoice') {
    paymentStatus = 'invoiced';
  }

  const orderData = {
    order_number: orderNumber,
    customer_id: selectedCustomer.id,
    customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
    customer_phone: selectedCustomer.phone,
    customer_address: selectedCustomer.full_address,
    products: cart.map(item => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.unit_price
    })),
    subtotal: subtotal,
    adjustments: adjustments,
    delivery_fee: deliveryFee,
    total_amount: subtotal + adjustments + deliveryFee,
    delivery_date: deliveryDate,
    delivery_time: deliveryTime,
    truck_type: truckType as TruckType,
    truck_id: truckId || null,
    driver_id: driverId || null,
    admin_id: userId,
    special_instructions: specialInstructions || null,
    payment_method: paymentMethod,
    status: 'requested' as Database["public"]["Enums"]["order_status"],
    payment_status: paymentStatus,
    is_split_order: false,
    master_order_id: null,
    split_number: null
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = cart.map(item => ({
    order_id: order.id,
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    price_adjustment: 0
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Update truck status if needed
  if (truckId) {
    await supabase
      .from('trucks')
      .update({ status: 'assigned' })
      .eq('id', truckId);
  }

  return { orderNumber, type: 'single' };
}

async function createSplitOrder(params: {
  selectedCustomer: Customer;
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  splits: SplitConfig[];
  paymentMethod: string;
  userId: string;
}): Promise<SplitOrderResult> {
  const {
    selectedCustomer,
    cart,
    subtotal,
    adjustments,
    deliveryFee,
    splits,
    paymentMethod,
    userId
  } = params;

  const masterOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  let paymentStatus = 'pending';
  if (paymentMethod === 'account') {
    paymentStatus = 'account_billing';
  } else if (paymentMethod === '7_day_invoice') {
    paymentStatus = 'invoiced';
  }

  // Create master order
  const masterOrderData = {
    order_number: masterOrderNumber,
    customer_id: selectedCustomer.id,
    customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
    customer_phone: selectedCustomer.phone,
    customer_address: selectedCustomer.full_address,
    products: cart.map(item => ({
      id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.unit_price
    })),
    subtotal: subtotal,
    adjustments: adjustments,
    delivery_fee: deliveryFee,
    total_amount: subtotal + adjustments + deliveryFee,
    delivery_date: splits[0]?.deliveryDate || null,
    delivery_time: splits[0]?.deliveryTime || null,
    truck_type: null,
    truck_id: null,
    driver_id: null,
    admin_id: userId,
    special_instructions: `Master order for ${splits.length} splits`,
    payment_method: paymentMethod,
    status: 'requested' as Database["public"]["Enums"]["order_status"],
    payment_status: paymentStatus,
    is_split_order: false,
    master_order_id: null,
    split_number: null
  };

  const { data: masterOrder, error: masterOrderError } = await supabase
    .from('orders')
    .insert(masterOrderData)
    .select()
    .single();

  if (masterOrderError) throw masterOrderError;

  // Create individual split orders
  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    const splitOrderNumber = `${masterOrderNumber}-${i + 1}`;
    
    const splitProducts = split.products.map(splitProduct => {
      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
      return {
        id: splitProduct.productId,
        name: cartItem?.product.name || '',
        quantity: splitProduct.quantity,
        price: cartItem?.unit_price || 0
      };
    });

    const splitSubtotal = split.products.reduce((sum, splitProduct) => {
      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
      return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
    }, 0);

    const splitOrderData = {
      order_number: splitOrderNumber,
      customer_id: selectedCustomer.id,
      customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
      customer_phone: selectedCustomer.phone,
      customer_address: selectedCustomer.full_address,
      products: splitProducts,
      subtotal: splitSubtotal,
      adjustments: 0,
      delivery_fee: i === 0 ? deliveryFee : 0, // Only charge delivery fee on first split
      total_amount: splitSubtotal + (i === 0 ? deliveryFee : 0),
      delivery_date: split.deliveryDate,
      delivery_time: split.deliveryTime,
      truck_type: split.truckType as TruckType || null,
      truck_id: split.truckId || null,
      driver_id: split.driverId || null,
      admin_id: userId,
      special_instructions: split.specialInstructions || null,
      payment_method: paymentMethod,
      status: 'requested' as Database["public"]["Enums"]["order_status"],
      payment_status: paymentStatus,
      is_split_order: true,
      master_order_id: masterOrder.id,
      split_number: i + 1
    };

    const { data: splitOrder, error: splitOrderError } = await supabase
      .from('orders')
      .insert(splitOrderData)
      .select()
      .single();

    if (splitOrderError) throw splitOrderError;

    // Create order items for this split
    const splitOrderItems = split.products.map(splitProduct => {
      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
      return {
        order_id: splitOrder.id,
        product_id: splitProduct.productId,
        quantity: splitProduct.quantity,
        unit_price: cartItem?.unit_price || 0,
        total_price: (cartItem?.unit_price || 0) * splitProduct.quantity,
        price_adjustment: 0
      };
    });

    const { error: splitItemsError } = await supabase
      .from('order_items')
      .insert(splitOrderItems);

    if (splitItemsError) throw splitItemsError;

    // Update truck status if assigned
    if (split.truckId) {
      await supabase
        .from('trucks')
        .update({ status: 'assigned' })
        .eq('id', split.truckId);
    }
  }

  return { orderNumber: masterOrderNumber, type: 'split', splitCount: splits.length };
}
