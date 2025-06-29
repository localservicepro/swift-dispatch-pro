
import { supabase } from "@/integrations/supabase/client";
import { Customer, CartItem } from "../types";

// Interface for creating single orders
interface CreateSingleOrderParams {
  customer: Customer;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  paymentMethod: string;
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
  suburbId: string;
  orderTotals: any;
}

// Interface for creating split orders (simplified)
interface CreateSplitOrderParams {
  customer: Customer;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  splits: any[];
  paymentMethod: string;
  specialInstructions: string;
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  orderTotals: any;
}

// Helper function to convert CartItem to JSON-serializable format
const serializeCartItems = (cart: CartItem[]) => {
  return cart.map(item => ({
    id: item.product.id,
    name: item.product.name,
    price: item.unit_price,
    quantity: parseFloat(item.quantity.toString()), // Ensure decimal support
    total_price: item.total_price
  }));
};

export async function createSingleOrder(params: CreateSingleOrderParams) {
  try {
    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Serialize cart items for database storage
    const serializedProducts = serializeCartItems(params.cart);

    const orderData = {
      order_number: orderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      delivery_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      products: JSON.stringify(serializedProducts),
      subtotal: params.orderTotals.subtotal.toString(),
      adjustments: params.orderTotals.adjustments.toString(),
      delivery_fee: params.orderTotals.deliveryFee.toString(),
      total_amount: params.orderTotals.totalAmount.toString(),
      delivery_method: params.deliveryMethod,
      delivery_date: params.deliveryDate || null,
      delivery_time: params.deliveryTime || null,
      special_instructions: params.specialInstructions,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      payment_method: params.paymentMethod,
      status: 'requested',
      payment_status: 'pending'
    };

    console.log('Creating single order via RPC:', orderData);

    const { data: orderId, error } = await supabase.rpc('create_single_order', {
      p_order_data: orderData
    });

    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    console.log('Single order created successfully with ID:', orderId);

    return {
      type: 'single' as const,
      orderNumber: orderNumber,
      orderId: orderId
    };
  } catch (error: any) {
    console.error('Error in createSingleOrder:', error);
    throw new Error(error.message || 'Failed to create single order');
  }
}

export async function createSplitOrder(params: CreateSplitOrderParams) {
  try {
    const masterOrderNumber = `SPL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Serialize cart items for database storage
    const serializedProducts = serializeCartItems(params.cart);

    // Create master order data
    const masterOrderData = {
      order_number: masterOrderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.customer.full_address,
      delivery_address: params.customer.full_address,
      products: JSON.stringify(serializedProducts),
      subtotal: params.orderTotals.subtotal.toString(),
      adjustments: params.orderTotals.adjustments.toString(),
      delivery_fee: params.orderTotals.deliveryFee.toString(),
      total_amount: params.orderTotals.totalAmount.toString(),
      delivery_method: params.deliveryMethod,
      payment_method: params.paymentMethod,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      status: 'requested',
      payment_status: 'pending'
    };

    // Create individual split orders data
    const splitOrdersData = params.splits.map((split, i) => {
      // Calculate split totals with decimal quantity support
      const splitSubtotal = split.products.reduce((sum: number, splitProduct: any) => {
        const cartItem = params.cart.find(cartItem => cartItem.product.id === splitProduct.productId);
        if (!cartItem) return sum;
        return sum + (cartItem.unit_price * parseFloat(splitProduct.quantity.toString()));
      }, 0);

      // Convert split products to match the expected format
      const splitProducts = split.products.map((splitProduct: any) => {
        const cartItem = params.cart.find(cartItem => cartItem.product.id === splitProduct.productId);
        if (!cartItem) return null;
        return {
          id: cartItem.product.id,
          name: cartItem.product.name,
          price: cartItem.unit_price,
          quantity: parseFloat(splitProduct.quantity.toString()),
          total_price: cartItem.unit_price * parseFloat(splitProduct.quantity.toString())
        };
      }).filter(Boolean);

      return {
        order_number: `${masterOrderNumber}-${i + 1}`,
        customer_id: params.customer.id,
        customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
        customer_phone: params.customer.phone,
        customer_address: split.deliveryAddress,
        delivery_address: split.deliveryAddress,
        products: JSON.stringify(splitProducts),
        subtotal: splitSubtotal.toString(),
        adjustments: '0',
        delivery_fee: (split.deliveryFee || 0).toString(),
        total_amount: (splitSubtotal + (split.deliveryFee || 0)).toString(),
        delivery_method: params.deliveryMethod,
        delivery_date: split.deliveryDate,
        delivery_time: split.deliveryTime,
        special_instructions: split.specialInstructions || '',
        order_notes: params.orderNotes,
        delivery_notes: params.deliveryNotes,
        purchase_order: params.purchaseOrder,
        payment_method: params.paymentMethod,
        status: 'requested',
        payment_status: 'pending'
      };
    });

    console.log('Creating split orders via RPC:', { masterOrderData, splitOrdersData });

    const { data: orderIds, error } = await supabase.rpc('create_split_order', {
      p_master_order_data: masterOrderData,
      p_split_orders: splitOrdersData
    });

    if (error) {
      console.error('Error creating split orders:', error);
      throw new Error(`Failed to create split orders: ${error.message}`);
    }

    console.log('Split orders created successfully with IDs:', orderIds);

    return {
      type: 'split' as const,
      orderNumber: masterOrderNumber,
      splitCount: params.splits.length,
      orderIds: orderIds
    };
  } catch (error: any) {
    console.error('Error in createSplitOrder:', error);
    throw new Error(error.message || 'Failed to create split order');
  }
}
