import { supabase } from "@/integrations/supabase/client";
import { resolvePaymentType } from "@/utils/paymentModel";
import { calculateOrderTotals } from "../utils/paymentCalculations";

export interface YardSaleLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string | null;
}

export interface YardSaleAccountCustomer {
  id: string;
  name: string;
  phone: string | null;
  full_address: string | null;
  customer_type: string | null;
}

interface CreateYardSaleOrderParams {
  lines: YardSaleLine[];
  /** Per-transaction settlement value: 'cash' | 'card' | 'on_account' */
  paymentMethod: string;
  /** Only present on the rare "On account" path. */
  customer?: YardSaleAccountCustomer | null;
}

const PICKUP_ADDRESS = import.meta.env.VITE_PICKUP_ADDRESS || "Pickup from yard";

/**
 * Walk-up counter sale. Pickup, immediate, no delivery config.
 *
 * payment_type is ALWAYS derived through the Batch 0 resolver:
 *  - walk-in cash/card  -> 'prepaid'
 *  - on-account sale    -> resolved from the customer's account standing
 *    (account customers -> '30_day_account', so isStatementEligible() is true)
 * It is never hardcoded and never written as null.
 */
export async function createYardSaleOrder(params: CreateYardSaleOrderParams) {
  const { lines, paymentMethod, customer } = params;

  if (!lines.length) throw new Error("Add at least one product before taking payment.");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("payment_settings")
    .select("*")
    .single();
  if (settingsError || !settings) {
    throw new Error("Payment settings not found. Please configure payment settings first.");
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  // Reuse the stabilised shared total calculation (Batch 1). Pickup => no
  // delivery fee and no fuel surcharge.
  const totals = calculateOrderTotals(subtotal, 0, 0, paymentMethod, settings as any, "pickup", 1);

  const isAccountSale = !!customer;

  const orderData = {
    order_number: "", // trigger-generated
    customer_id: customer?.id ?? null,
    customer_name: customer?.name || "Walk-in Customer",
    customer_phone: customer?.phone ?? null,
    customer_address: customer?.full_address || PICKUP_ADDRESS,
    delivery_address: PICKUP_ADDRESS,
    same_as_billing: true,
    delivery_suburb_id: null,
    products: lines.map((l) => ({
      id: l.id,
      name: l.name,
      price: l.price,
      quantity: l.quantity,
      total_price: l.price * l.quantity,
    })),
    subtotal,
    adjustments: 0,
    delivery_fee: 0,
    fuel_surcharge: 0,
    total_amount: totals.totalAmount,
    delivery_method: "pickup" as const,
    delivery_date: null,
    delivery_time: null,
    admin_id: session.user.id,
    special_instructions: "",
    order_notes: "Yard sale (counter)",
    payment_method: paymentMethod,
    payment_type: resolvePaymentType({
      customerType: customer?.customer_type ?? null,
      paymentMethod,
    }),
    status: "delivered" as const,
    is_split_order: false,
    placed_via: "yard_sale",
    payment_status: isAccountSale ? "pending" : "paid",
    payment_date: isAccountSale ? null : new Date().toISOString(),
  };

  const { data: order, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id, order_number, payment_type")
    .single();

  if (error) throw new Error(`Failed to create yard sale: ${error.message}`);

  return {
    orderId: order.id as string,
    orderNumber: order.order_number as string,
    paymentType: order.payment_type as string,
    totalAmount: totals.totalAmount,
  };
}
