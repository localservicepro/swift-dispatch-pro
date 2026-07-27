
import { supabase } from "@/integrations/supabase/client";
import { Customer, CartItem, SelectedContact } from "../types";
import { serializeCartItemsWithFormatting } from "./orderFormattingService";

// Parse a delivery_rate string like "AU$45" / "$45.00" / "45" to a number.
function parseSuburbDeliveryRate(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[AU$\s]/gi, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Apply the global delivery markup (matches useDeliveryFeeCalculation.applyMarkup)
function applyDeliveryMarkup(
  baseFee: number,
  settings: { delivery_markup_value?: number | null; delivery_markup_type?: string | null }
): number {
  const markup = Number(settings?.delivery_markup_value) || 0;
  if (markup <= 0) return baseFee;
  if (settings?.delivery_markup_type === "fixed") return baseFee + markup;
  return baseFee + (baseFee * markup) / 100;
}

/**
 * Look up suburbs by id and return server-authoritative delivery fees keyed by id.
 * Returns an empty map for ids that don't exist or have unparseable rates.
 */
async function fetchAuthoritativeDeliveryFees(
  suburbIds: string[],
  paymentSettings: { delivery_markup_value?: number | null; delivery_markup_type?: string | null }
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = Array.from(new Set(suburbIds.filter(Boolean)));
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("suburbs")
    .select("id, name, delivery_rate")
    .in("id", unique);

  if (error) {
    console.error("Error fetching suburbs for fee recompute:", error);
    return map;
  }

  for (const row of data || []) {
    const base = parseSuburbDeliveryRate(row.delivery_rate as any);
    map.set(row.id as string, applyDeliveryMarkup(base, paymentSettings));
  }
  return map;
}

// Custom error type so callers can show a "please sign in" UI instead of the
// raw Postgres "row violates row-level security" message.
export class SessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please sign in again to create the order.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

/**
 * Verify the user has a live, non-expired Supabase session before attempting
 * an authenticated INSERT. Without this, an expired session causes Postgres
 * to reject the row with a confusing RLS error and the in-flight order data
 * is lost when the AuthProvider redirects to the login screen.
 */
async function assertActiveSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new SessionExpiredError();
  }
  // expires_at is a unix timestamp in seconds
  if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
    throw new SessionExpiredError();
  }
  return session.user.id;
}

// Google Sheets sync is now handled centrally via syncAllOrdersToSheets in @/utils/googleSheetsSync.ts

// Interface for creating single orders
interface CreateSingleOrderParams {
  customer: Customer;
  selectedContact?: SelectedContact | null;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  pickupTiming?: "now" | "scheduled";
  specialInstructions: string;
  paymentType: string;
  paymentMethod: string;
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
  suburbId: string;
  orderTotals: any;
  // When true, the admin explicitly typed a delivery fee that overrides the
  // suburb-derived rate. The server must respect this and skip recomputation.
  isDeliveryFeeManuallySet?: boolean;
}

// Interface for creating split orders (simplified)
interface CreateSplitOrderParams {
  customer: Customer;
  selectedContact?: SelectedContact | null;
  cart: CartItem[];
  adjustments: number;
  deliveryMethod: "delivery" | "pickup";
  pickupTiming?: "now" | "scheduled";
  splits: any[];
  paymentType: string;
  paymentMethod: string;
  specialInstructions: string;
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  orderTotals: any;
}

export async function createSingleOrder(params: CreateSingleOrderParams) {
  try {
    // Pre-flight session check — converts the would-be RLS error into a
    // clean SessionExpiredError that the UI can surface without losing draft.
    const adminId = await assertActiveSession();

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

    // Serialize cart items for database storage - the trigger will automatically create products_formatted
    const serializedProducts = serializeCartItemsWithFormatting(params.cart);

    // SERVER-SIDE AUTHORITATIVE FUEL SURCHARGE & TOTAL CALCULATION
    // Don't trust client-supplied fuelSurcharge/totalAmount — they can be 0 if
    // payment_settings hadn't loaded when the user clicked Confirm. Recompute
    // from the freshly-fetched paymentSettings to guarantee correctness.
    const authoritativeFuelSurchargePerUnit =
      params.deliveryMethod === 'delivery' ? Number(paymentSettings.fuel_surcharge) || 0 : 0;
    const authoritativeFuelSurcharge = authoritativeFuelSurchargePerUnit; // single order = 1 unit
    const authoritativeSubtotal = Number(params.orderTotals.subtotal) || 0;
    const authoritativeAdjustments = Number(params.orderTotals.adjustments) || 0;

    // SERVER-SIDE AUTHORITATIVE DELIVERY FEE
    // Goal: never silently save $0 for a delivery order with a valid suburb,
    // while ALSO respecting an admin's explicit manual override of the
    // suburb-derived rate (e.g. typing $20 instead of the default $55).
    //
    // Rules:
    //  - Pickup orders: fee is always 0.
    //  - Manually set: trust the client value verbatim (admin override).
    //  - Otherwise: recompute from the suburbs table; if that yields 0 for a
    //    delivery order with a suburb selected, throw so the operator can
    //    reselect the suburb instead of undercharging.
    const clientDeliveryFee = Number(params.orderTotals.deliveryFee) || 0;
    let authoritativeDeliveryFee = clientDeliveryFee;
    const isDelivery = params.deliveryMethod === 'delivery';
    const deliverySuburbIdForLookup = isDelivery ? (params.suburbId || null) : null;
    const manualOverride = !!params.isDeliveryFeeManuallySet;

    if (isDelivery && deliverySuburbIdForLookup && !manualOverride) {
      const feeMap = await fetchAuthoritativeDeliveryFees(
        [deliverySuburbIdForLookup],
        paymentSettings
      );
      const serverFee = feeMap.get(deliverySuburbIdForLookup);

      if (typeof serverFee === 'number' && serverFee > 0) {
        if (Math.abs(serverFee - clientDeliveryFee) > 0.01) {
          console.warn('🚚 Delivery fee mismatch — using server value', {
            suburb_id: deliverySuburbIdForLookup,
            clientDeliveryFee,
            serverDeliveryFee: serverFee,
          });
        }
        authoritativeDeliveryFee = serverFee;
      } else {
        // Suburb has no usable delivery_rate. Don't silently save $0.
        throw new Error(
          'Delivery fee could not be determined for the selected suburb. Please reselect the delivery suburb and try again.'
        );
      }
    } else if (manualOverride) {
      console.log('🚚 Using manually set delivery fee (admin override):', {
        suburb_id: deliverySuburbIdForLookup,
        manualDeliveryFee: clientDeliveryFee,
      });
    }

    const authoritativeTotal =
      authoritativeSubtotal +
      authoritativeAdjustments +
      authoritativeDeliveryFee +
      authoritativeFuelSurcharge;

    console.log('🚚 Single order authoritative totals:', {
      subtotal: authoritativeSubtotal,
      adjustments: authoritativeAdjustments,
      deliveryFee: authoritativeDeliveryFee,
      clientDeliveryFee,
      fuelSurcharge: authoritativeFuelSurcharge,
      totalAmount: authoritativeTotal,
      clientFuelSurcharge: params.orderTotals.fuelSurcharge,
      clientTotal: params.orderTotals.totalAmount,
    });

    // Determine order status based on delivery method and pickup timing
    let orderStatus: 'back_order' | 'requested' | 'delivered' = 'requested';
    
    if (params.deliveryMethod === 'pickup') {
      if (params.pickupTiming === 'now') {
        // Immediate pickup orders go straight to delivered
        orderStatus = 'delivered';
      } else {
        // Scheduled pickup orders go to back_order (On Hold)
        orderStatus = 'back_order';
      }
    } else {
      // For delivery orders, check stock availability
      const { data: statusResult, error: statusError } = await supabase
        .rpc('determine_order_status', { order_items: serializedProducts });
      
      if (statusError) {
        console.warn('Error determining order status, defaulting to requested:', statusError);
        orderStatus = 'requested';
      } else {
        // Map the database function result to our allowed statuses
        orderStatus = (statusResult === 'back_order') ? 'back_order' : 'requested';
      }
    }

    const pickupAddress = import.meta.env.VITE_PICKUP_ADDRESS || 'Pickup from yard';
    const isPickup = params.deliveryMethod === 'pickup';
    const customerAddress = isPickup
      ? pickupAddress
      : (params.sameAsBilling ? params.customer.full_address : params.deliveryAddress);
    const deliveryAddress = isPickup
      ? pickupAddress
      : (params.sameAsBilling ? params.customer.full_address : params.deliveryAddress);
    const sameAsBilling = isPickup ? true : params.sameAsBilling;
    const deliverySuburbId = isPickup ? null : (params.suburbId || null);

    const orderData = {
      order_number: '', // Will be auto-generated by database trigger
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: customerAddress,
      delivery_address: deliveryAddress,
      same_as_billing: sameAsBilling,
      delivery_suburb_id: deliverySuburbId,
      contact_id: params.selectedContact?.id || null,
      contact_name: params.selectedContact?.name || null,
      contact_email: params.selectedContact?.email || null,
      contact_phone: params.selectedContact?.phone || null,
      products: serializedProducts,
      subtotal: authoritativeSubtotal,
      adjustments: authoritativeAdjustments,
      delivery_fee: authoritativeDeliveryFee,
      fuel_surcharge: authoritativeFuelSurcharge,
      total_amount: authoritativeTotal,
      delivery_method: params.deliveryMethod,
      delivery_date: params.deliveryDate || null,
      delivery_time: params.deliveryTime || null,
      truck_type: null,
      truck_id: null,
      driver_id: null,
      admin_id: adminId,
      special_instructions: params.specialInstructions,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      payment_method: params.paymentMethod,
      payment_type: params.paymentType,
      status: orderStatus,
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
    if (error instanceof SessionExpiredError) throw error;
    throw new Error(error.message || 'Failed to create single order');
  }
}

export async function createSplitOrder(params: CreateSplitOrderParams) {
  try {
    // Pre-flight session check — see createSingleOrder for rationale.
    const adminId = await assertActiveSession();

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

    const orders = [];

    // Serialize cart items for database storage
    const serializedProducts = serializeCartItemsWithFormatting(params.cart);

    // Determine master order status based on delivery method and pickup timing
    let masterOrderStatus: 'back_order' | 'requested' | 'delivered' = 'requested';
    
    if (params.deliveryMethod === 'pickup') {
      if (params.pickupTiming === 'now') {
        // Immediate pickup orders go straight to delivered
        masterOrderStatus = 'delivered';
      } else {
        // Scheduled pickup orders go to back_order (On Hold)
        masterOrderStatus = 'back_order';
      }
    } else {
      // For delivery orders, check stock availability
      const { data: statusResult, error: statusError } = await supabase
        .rpc('determine_order_status', { order_items: serializedProducts });
      
      if (statusError) {
        console.warn('Error determining master order status, defaulting to requested:', statusError);
        masterOrderStatus = 'requested';
      } else {
        // Map the database function result to our allowed statuses
        masterOrderStatus = (statusResult === 'back_order') ? 'back_order' : 'requested';
      }
    }

    // Create master order entry - this is a summary record
    const pickupAddress = import.meta.env.VITE_PICKUP_ADDRESS || 'Pickup from yard';
    const isPickup = params.deliveryMethod === 'pickup';
    
    // Use fallback strategy for master order address to prevent null constraint violations.
    // When every split shares a single address/suburb/sameAsBilling, mirror that
    // onto the master so downstream displays (opportunity card, receipts) show
    // the actual delivery destination rather than the customer's registered
    // billing fragment. Otherwise fall back to the customer address.
    let masterCustomerAddress: string;
    let masterDeliveryAddress: string;
    let masterSameAsBilling = true;
    let masterDeliverySuburbId: string | null = null;

    if (isPickup) {
      masterCustomerAddress = pickupAddress;
      masterDeliveryAddress = pickupAddress;
    } else {
      const first = params.splits[0];
      const allSplitsAgree = params.splits.length > 0 && params.splits.every(s =>
        !!s.sameAsBilling === !!first?.sameAsBilling &&
        (s.deliveryAddress || '') === (first?.deliveryAddress || '') &&
        (s.deliverySuburbId || s.suburbId || '') === (first?.deliverySuburbId || first?.suburbId || '')
      );

      if (allSplitsAgree && first) {
        masterSameAsBilling = !!first.sameAsBilling;
        if (first.sameAsBilling) {
          const billing = params.customer.full_address || 'Address to be confirmed';
          masterCustomerAddress = billing;
          masterDeliveryAddress = billing;
          masterDeliverySuburbId = params.customer.suburb_id || null;
        } else {
          const custom = first.deliveryAddress || params.customer.full_address || 'Address to be confirmed';
          masterCustomerAddress = custom;
          masterDeliveryAddress = custom;
          masterDeliverySuburbId = first.deliverySuburbId || first.suburbId || null;
        }
      } else {
        const fallbackAddress = params.customer.full_address ||
                                (params.splits.length > 0 && !params.splits[0].sameAsBilling ? params.splits[0].deliveryAddress : null) ||
                                'Address to be confirmed';
        masterCustomerAddress = fallbackAddress;
        masterDeliveryAddress = fallbackAddress;
        masterDeliverySuburbId = params.customer.suburb_id || null;
      }
    }

    // SERVER-SIDE AUTHORITATIVE PER-SPLIT DELIVERY FEE
    // For each delivery split, look up the suburb in the database and recompute
    // the fee. This guards against client state ever sending 0 for a delivery
    // split that has a valid suburb (see createSingleOrder for the same fix).
    const splitSuburbIdFor = (split: any): string | null => {
      if (params.deliveryMethod !== 'delivery') return null;
      if (split.sameAsBilling) return params.customer.suburb_id || null;
      return split.deliverySuburbId || split.suburbId || null;
    };

    const splitSuburbIds = params.splits
      .map(splitSuburbIdFor)
      .filter((id): id is string => !!id);

    const serverFeeBySuburbId =
      params.deliveryMethod === 'delivery' && splitSuburbIds.length > 0
        ? await fetchAuthoritativeDeliveryFees(splitSuburbIds, paymentSettings)
        : new Map<string, number>();

    const authoritativeSplitFees: number[] = params.splits.map((split, idx) => {
      if (params.deliveryMethod !== 'delivery') return 0;
      const suburbId = splitSuburbIdFor(split);
      const clientFee = Number(split.deliveryFee) || 0;
      const manualOverride = !!split.deliveryFeeManual;

      if (suburbId) {
        const serverFee = serverFeeBySuburbId.get(suburbId);

        // Explicit admin override wins — trust the client value verbatim.
        if (manualOverride) {
          console.log(`🚚 Split #${idx + 1} using manually set delivery fee`, {
            suburb_id: suburbId,
            manualDeliveryFee: clientFee,
            suburbDefaultFee: serverFee,
          });
          return clientFee;
        }

        if (typeof serverFee === 'number' && serverFee > 0) {
          // No manual override: always use the server-computed fee (which
          // includes the global delivery markup). This prevents the client's
          // stale/un-marked value from being persisted as if it were an
          // override — the root cause of the "$5 markup missing on splits"
          // and "manual fee reverts on print" reports.
          if (Math.abs(serverFee - clientFee) > 0.01) {
            console.warn(`🚚 Split #${idx + 1} delivery fee mismatch — using server value`, {
              suburb_id: suburbId,
              clientDeliveryFee: clientFee,
              serverDeliveryFee: serverFee,
            });
          }
          return serverFee;
        }
        // Suburb known but no usable rate → refuse to silently undercharge,
        // unless the admin explicitly typed a non-zero fee for this split.
        if (clientFee > 0) return clientFee;
        throw new Error(
          `Delivery fee could not be determined for split #${idx + 1}. Please reselect that split's delivery suburb and try again.`
        );
      }

      // No suburb on this split (admin chose address-only) → trust client value.
      return clientFee;
    });

    const totalDeliveryFee = authoritativeSplitFees.reduce((sum, fee) => sum + fee, 0);

    // Calculate fuel surcharge: per split for delivery orders
    const fuelSurchargePerUnit = params.deliveryMethod === 'delivery' ? (paymentSettings.fuel_surcharge || 0) : 0;
    const totalFuelSurcharge = fuelSurchargePerUnit * params.splits.length;
    
    const masterOrderData = {
      order_number: '', // Will be auto-generated by database trigger
      customer_id: params.customer.id,
      customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
      customer_phone: params.customer.phone,
      customer_address: masterCustomerAddress,
      delivery_address: masterDeliveryAddress,
      same_as_billing: masterSameAsBilling,
      delivery_suburb_id: isPickup ? null : masterDeliverySuburbId,
      contact_id: params.selectedContact?.id || null,
      contact_name: params.selectedContact?.name || null,
      contact_email: params.selectedContact?.email || null,
      contact_phone: params.selectedContact?.phone || null,
      products: serializedProducts,
      subtotal: Number(params.orderTotals.subtotal) || 0,
      adjustments: Number(params.orderTotals.adjustments) || 0,
      delivery_fee: totalDeliveryFee,
      fuel_surcharge: totalFuelSurcharge,
      total_amount:
        (Number(params.orderTotals.subtotal) || 0) +
        (Number(params.orderTotals.adjustments) || 0) +
        totalDeliveryFee +
        totalFuelSurcharge,
      delivery_method: params.deliveryMethod,
      payment_method: params.paymentMethod,
      payment_type: params.paymentType,
      order_notes: params.orderNotes,
      delivery_notes: params.deliveryNotes,
      purchase_order: params.purchaseOrder,
      status: masterOrderStatus,
      is_split_order: false, // Master order is not a split order itself
      master_order_id: null,
      split_number: null,
      payment_status: 'pending',
      truck_type: null,
      truck_id: null,
      driver_id: null,
      admin_id: adminId
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
      // Calculate split totals with decimal quantity support
      const splitDeliveryFee = authoritativeSplitFees[i] || 0;
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

      // Determine split order status based on delivery method and pickup timing
      let splitOrderStatus: 'back_order' | 'requested' | 'delivered' = 'requested';
      
      if (params.deliveryMethod === 'pickup') {
        if (params.pickupTiming === 'now') {
          // Immediate pickup orders go straight to delivered
          splitOrderStatus = 'delivered';
        } else {
          // Scheduled pickup orders go to back_order (On Hold)
          splitOrderStatus = 'back_order';
        }
      } else {
        // For delivery orders, check stock availability of this split's products
        const { data: statusResult, error: statusError } = await supabase
          .rpc('determine_order_status', { order_items: splitProducts });
        
        if (statusError) {
          console.warn(`Error determining split order ${i + 1} status, defaulting to requested:`, statusError);
          splitOrderStatus = 'requested';
        } else {
          // Map the database function result to our allowed statuses
          splitOrderStatus = (statusResult === 'back_order') ? 'back_order' : 'requested';
        }
      }

      // Use fallback strategy for split addresses to prevent null constraint violations
      let splitCustomerAddress: string;
      let splitDeliveryAddress: string;
      
      if (isPickup) {
        splitCustomerAddress = pickupAddress;
        splitDeliveryAddress = pickupAddress;
      } else if (split.sameAsBilling) {
        const billingAddress = params.customer.full_address || 'Customer address to be confirmed';
        splitCustomerAddress = billingAddress;
        splitDeliveryAddress = billingAddress;
      } else {
        const customAddress = split.deliveryAddress || 'Delivery address to be confirmed';
        splitCustomerAddress = customAddress;
        splitDeliveryAddress = customAddress;
      }
      const splitSameAsBilling = isPickup ? true : split.sameAsBilling;
      const splitDeliverySuburbId = isPickup ? null : (split.sameAsBilling ? params.customer.suburb_id : (split.deliverySuburbId || split.suburbId));

      const splitOrderData = {
        order_number: '', // Will be auto-generated by database trigger
        customer_id: params.customer.id,
        customer_name: `${params.customer.first_name} ${params.customer.last_name}`,
        customer_phone: params.customer.phone,
        customer_address: splitCustomerAddress,
        delivery_address: splitDeliveryAddress,
        same_as_billing: splitSameAsBilling,
        delivery_suburb_id: splitDeliverySuburbId,
        contact_id: params.selectedContact?.id || null,
        contact_name: params.selectedContact?.name || null,
        contact_email: params.selectedContact?.email || null,
        contact_phone: params.selectedContact?.phone || null,
        products: splitProducts,
        subtotal: splitSubtotal,
        adjustments: 0,
        delivery_fee: splitDeliveryFee,
        fuel_surcharge: fuelSurchargePerUnit,
        total_amount: splitSubtotal + splitDeliveryFee + fuelSurchargePerUnit,
        delivery_method: params.deliveryMethod,
        delivery_date: split.deliveryDate,
        delivery_time: split.deliveryTime,
        truck_type: null,
        truck_id: null,
        driver_id: null,
        admin_id: adminId,
        special_instructions: split.specialInstructions || '',
        order_notes: params.orderNotes,
        delivery_notes: params.deliveryNotes,
        purchase_order: params.purchaseOrder,
        payment_method: params.paymentMethod,
        payment_type: params.paymentType,
        status: splitOrderStatus,
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
      orderNumber: masterOrder.order_number,
      splitCount: params.splits.length,
      orders
    };
  } catch (error: any) {
    console.error('Error in createSplitOrder:', error);
    if (error instanceof SessionExpiredError) throw error;
    throw new Error(error.message || 'Failed to create split order');
  }
}
