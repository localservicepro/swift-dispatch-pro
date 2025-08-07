
import { supabase } from "@/integrations/supabase/client";
import { Customer, CartItem, SelectedContact } from "../types";
import { serializeCartItemsWithFormatting } from "./orderFormattingService";

// Interface for creating single orders
interface CreateSingleOrderParams {
  customer: Customer;
  selectedContact?: SelectedContact | null;
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
  selectedContact?: SelectedContact | null;
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

    // Serialize cart items for database storage - the trigger will automatically create products_formatted
    const serializedProducts = serializeCartItemsWithFormatting(params.cart);

    const orderData = {
      order_number: orderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      delivery_address: params.sameAsBilling ? params.customer.full_address : params.deliveryAddress,
      same_as_billing: params.sameAsBilling,
      delivery_suburb_id: params.suburbId || null,
      contact_id: params.selectedContact?.id || null,
      contact_name: params.selectedContact?.name || null,
      contact_email: params.selectedContact?.email || null,
      contact_phone: params.selectedContact?.phone || null,
      products: serializedProducts,
      subtotal: params.orderTotals.subtotal,
      adjustments: params.orderTotals.adjustments,
      delivery_fee: params.orderTotals.deliveryFee,
      total_amount: params.orderTotals.totalAmount,
      delivery_method: params.deliveryMethod,
      delivery_date: params.deliveryDate || null,
      delivery_time: params.deliveryTime || null,
      truck_type: null,
      truck_id: null,
      driver_id: null,
      special_instructions: params.specialInstructions,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      payment_method: params.paymentMethod,
      status: 'requested' as const,
      is_split_order: false,
      payment_status: 'pending'
      // Note: driver_name, truck_registration, truck_type_display will be automatically populated by the database trigger
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
    const serializedProducts = serializeCartItemsWithFormatting(params.cart);

    // Create master order entry - this is a summary record
    const masterOrderData = {
      order_number: masterOrderNumber,
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: params.customer.full_address,
      delivery_address: params.customer.full_address,
      same_as_billing: true,
      contact_id: params.selectedContact?.id || null,
      contact_name: params.selectedContact?.name || null,
      contact_email: params.selectedContact?.email || null,
      contact_phone: params.selectedContact?.phone || null,
      products: serializedProducts,
      subtotal: params.orderTotals.subtotal,
      adjustments: params.orderTotals.adjustments,
      delivery_fee: params.orderTotals.deliveryFee,
      total_amount: params.orderTotals.totalAmount,
      delivery_method: params.deliveryMethod,
      payment_method: params.paymentMethod,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      status: 'requested' as const,
      is_split_order: false, // Master order is not a split order itself
      master_order_id: null,
      split_number: null,
      payment_status: 'pending',
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
      
      // Calculate split totals with decimal quantity support
      const splitSubtotal = split.products.reduce((sum: number, splitProduct: any) => {
        const cartItem = params.cart.find(cartItem => cartItem.product.id === splitProduct.productId);
        if (!cartItem) {
          console.error(`Product not found in cart: ${splitProduct.productId}`);
          return sum;
        }
        return sum + (cartItem.unit_price * parseFloat(splitProduct.quantity.toString()));
      }, 0);

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
          quantity: parseFloat(splitProduct.quantity.toString()),
          total_price: cartItem.unit_price * parseFloat(splitProduct.quantity.toString())
        };
      }).filter(Boolean);

      const splitOrderData = {
        order_number: splitOrderNumber,
        customer_id: params.customer.id,
        customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
        customer_phone: params.customer.phone,
        customer_address: split.deliveryAddress,
        delivery_address: split.deliveryAddress,
        same_as_billing: false,
        contact_id: params.selectedContact?.id || null,
        contact_name: params.selectedContact?.name || null,
        contact_email: params.selectedContact?.email || null,
        contact_phone: params.selectedContact?.phone || null,
        products: splitProducts,
        subtotal: splitSubtotal,
        adjustments: 0,
        delivery_fee: split.deliveryFee || 0,
        total_amount: splitSubtotal + (split.deliveryFee || 0),
        delivery_method: params.deliveryMethod,
        delivery_date: split.deliveryDate,
        delivery_time: split.deliveryTime,
        truck_type: null,
        truck_id: null,
        driver_id: null,
        special_instructions: split.specialInstructions || '',
        order_notes: params.orderNotes,
        delivery_notes: params.deliveryNotes,
        purchase_order: params.purchaseOrder,
        payment_method: params.paymentMethod,
        status: 'requested' as const,
        is_split_order: true,
        master_order_id: masterOrder.id,
        split_number: i + 1,
        payment_status: 'pending'
        // Note: driver_name, truck_registration, truck_type_display will be automatically populated by the database trigger
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
