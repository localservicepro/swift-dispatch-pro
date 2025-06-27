
import { supabase } from "@/integrations/supabase/client";
import { Customer, CartItem } from "../types";
import { calculateOrderTotals } from "../utils/paymentCalculations";

// New interfaces for the exported functions
interface CreateSingleOrderParams {
  customer: Customer;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  paymentMethod: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
  suburbId: string;
  deliveryRate: number;
  orderTotals: any;
}

interface CreateSplitOrderParams {
  customer: Customer;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  splits: any[];
  paymentMethod: string;
  specialInstructions: string;
  orderTotals: any;
}

// Helper function to convert CartItem to JSON-serializable format
const serializeCartItems = (cart: CartItem[]) => {
  return cart.map(item => ({
    id: item.product.id,
    name: item.product.name,
    price: item.unit_price,
    quantity: item.quantity,
    total_price: item.total_price
  }));
};

export async function createSingleOrder(params: CreateSingleOrderParams) {
  try {
    // Fetch current payment settings for calculations
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching payment settings:', settingsError);
      throw new Error(`Failed to fetch payment settings: ${settingsError.message}`);
    }

    if (!paymentSettings) {
      throw new Error('Payment settings not found. Please configure payment settings first.');
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random()* 1000)}`;

    // Serialize cart items for database storage
    const serializedProducts = serializeCartItems(params.cart);

    const orderData = {
      order_number: orderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      delivery_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      same_as_billing: params.sameAsBilling,
      products: serializedProducts,
      subtotal: params.orderTotals.subtotal,
      adjustments: params.orderTotals.adjustments,
      delivery_fee: params.orderTotals.deliveryFee,
      total_amount: params.orderTotals.totalAmount,
      delivery_method: params.deliveryMethod,
      delivery_date: params.deliveryDate || null,
      delivery_time: params.deliveryTime || null,
      // Remove truck and driver assignment - set to null
      truck_type: null,
      truck_id: null,
      driver_id: null,
      special_instructions: params.specialInstructions,
      payment_method: params.paymentMethod,
      status: 'requested' as const, // Start with requested status
      is_split_order: false,
      payment_status: 'pending'
    };

    console.log('Creating single order with data:', orderData);

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
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
  } catch (error: any) {
    console.error('Error in createSingleOrder:', error);
    throw new Error(error.message || 'Failed to create single order');
  }
}

export async function createSplitOrder(params: CreateSplitOrderParams) {
  try {
    // Fetch current payment settings for calculations
    const { data: paymentSettings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching payment settings:', settingsError);
      throw new Error(`Failed to fetch payment settings: ${settingsError.message}`);
    }

    if (!paymentSettings) {
      throw new Error('Payment settings not found. Please configure payment settings first.');
    }

    const masterOrderNumber = `SPL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orders = [];

    // Serialize cart items for database storage
    const serializedProducts = serializeCartItems(params.cart);

    // Create master order entry - this is a summary record, not a split order itself
    const masterOrderData = {
      order_number: masterOrderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.customer.full_address,
      delivery_address: params.customer.full_address,
      same_as_billing: true,
      products: serializedProducts,
      subtotal: params.orderTotals.subtotal,
      adjustments: params.orderTotals.adjustments,
      delivery_fee: params.orderTotals.deliveryFee,
      total_amount: params.orderTotals.totalAmount,
      delivery_method: params.deliveryMethod,
      payment_method: params.paymentMethod,
      status: 'requested' as const, // Start with requested status
      is_split_order: false, // Master order is not a split order itself
      master_order_id: null,
      split_number: null, // Master order doesn't have a split number
      payment_status: 'pending',
      // Remove truck and driver assignment - set to null
      truck_type: null,
      truck_id: null,
      driver_id: null
    };

    const { data: masterOrder, error: masterError } = await supabase
      .from('orders')
      .insert(masterOrderData)
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
      
      // Calculate split totals by looking up prices from original cart
      const splitSubtotal = split.products.reduce((sum: number, splitProduct: any) => {
        const cartItem = params.cart.find(cartItem => cartItem.product.id === splitProduct.productId);
        if (!cartItem) {
          console.error(`Product not found in cart: ${splitProduct.productId}`);
          return sum;
        }
        return sum + (cartItem.unit_price * splitProduct.quantity);
      }, 0);

      console.log(`Split ${i + 1} subtotal:`, splitSubtotal);

      const splitTotals = calculateOrderTotals(
        splitSubtotal,
        0, // No adjustments on splits
        split.deliveryFee || 0,
        params.paymentMethod,
        paymentSettings
      );

      console.log(`Split ${i + 1} totals:`, splitTotals);

      // Convert split products to match the expected format
      const splitProducts = split.products.map((splitProduct: any) => {
        const cartItem = params.cart.find(cartItem => cartItem.product.id === splitProduct.productId);
        if (!cartItem) {
          console.error(`Product not found in cart for split product: ${splitProduct.productId}`);
          return null;
        }
        return {
          id: cartItem.product.id,
          name: cartItem.product.name,
          price: cartItem.unit_price,
          quantity: splitProduct.quantity,
          total_price: cartItem.unit_price * splitProduct.quantity
        };
      }).filter(Boolean); // Remove any null entries

      const splitOrderData = {
        order_number: splitOrderNumber,
        customer_id: params.customer.id,
        customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
        customer_phone: params.customer.phone,
        customer_address: split.deliveryAddress,
        delivery_address: split.deliveryAddress,
        same_as_billing: false,
        products: splitProducts,
        subtotal: splitTotals.subtotal,
        adjustments: 0,
        delivery_fee: splitTotals.deliveryFee,
        total_amount: splitTotals.totalAmount,
        delivery_method: params.deliveryMethod,
        delivery_date: split.deliveryDate,
        delivery_time: split.deliveryTime,
        // Remove truck and driver assignment - set to null
        truck_type: null,
        truck_id: null,
        driver_id: null,
        special_instructions: split.specialInstructions || '', // Use split-specific instructions
        payment_method: params.paymentMethod,
        status: 'requested' as const, // Start with requested status
        is_split_order: true,
        master_order_id: masterOrder.id,
        split_number: i + 1,
        payment_status: 'pending'
      };

      console.log(`Creating split order ${i + 1}:`, splitOrderData);

      const { data: splitOrder, error: splitError } = await supabase
        .from('orders')
        .insert(splitOrderData)
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
  } catch (error: any) {
    console.error('Error in createSplitOrder:', error);
    throw new Error(error.message || 'Failed to create split order');
  }
}
