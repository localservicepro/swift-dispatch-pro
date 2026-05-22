import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderItemSummary {
  product_id: string;
  product_name: string;
  quantity: number;
  line_total: number;
}

export interface OrderSummary {
  order_id: string;
  order_number: string;
  order_date: string;
  total: number;
  customer_phone: string | null;
  items: OrderItemSummary[];
}

export interface CustomerAggregate {
  customer_id: string | null;
  customer_name: string;
  display_name: string;
  business_name: string | null;
  entity_type: string | null;
  customer_type: string | null;
  phones: string[];
  total_quantity: number;
  total_amount: number;
  order_count: number;
  first_order: string;
  last_order: string;
  perProduct: Record<string, number>;
  orders: OrderSummary[];
}

interface DetailRow {
  customer_id: string | null;
  customer_name: string | null;
  business_name: string | null;
  entity_type: string | null;
  customer_type: string | null;
  customer_phone: string | null;
  order_id: string;
  order_number: string;
  order_date: string;
  product_id: string;
  product_name: string;
  quantity: number | string;
  line_total: number | string;
}

interface Params {
  productIds: string[];
  start: Date;
  end: Date;
  customerType?: string | null;
  enabled?: boolean;
}

export function useProductSalesReport({ productIds, start, end, customerType, enabled = true }: Params) {
  return useQuery({
    queryKey: ["product-sales-report", productIds, start.toISOString(), end.toISOString(), customerType ?? "all"],
    enabled: enabled && productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_product_orders_by_customer", {
        p_product_ids: productIds,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_customer_type: customerType && customerType !== "all" ? customerType : null,
      });
      if (error) throw error;
      const rows = (data ?? []) as DetailRow[];

      const map = new Map<string, CustomerAggregate>();
      for (const r of rows) {
        const key = r.customer_id ?? `name:${r.customer_name ?? "unknown"}`;
        const qty = Number(r.quantity);
        const amt = Number(r.line_total);

        let agg = map.get(key);
        if (!agg) {
          const personalName = r.customer_name ?? "Unknown";
          const isBusiness = r.entity_type === "business" && !!r.business_name;
          agg = {
            customer_id: r.customer_id,
            customer_name: personalName,
            display_name: isBusiness ? (r.business_name as string) : personalName,
            business_name: r.business_name,
            entity_type: r.entity_type,
            customer_type: r.customer_type,
            phones: [],
            total_quantity: 0,
            total_amount: 0,
            order_count: 0,
            first_order: r.order_date,
            last_order: r.order_date,
            perProduct: {},
            orders: [],
          };
          map.set(key, agg);
        }

        const phone = (r.customer_phone ?? "").trim();
        if (phone && !agg.phones.includes(phone)) agg.phones.push(phone);

        agg.total_quantity += qty;
        agg.total_amount += amt;
        agg.perProduct[r.product_id] = (agg.perProduct[r.product_id] ?? 0) + qty;
        if (new Date(r.order_date) < new Date(agg.first_order)) agg.first_order = r.order_date;
        if (new Date(r.order_date) > new Date(agg.last_order)) agg.last_order = r.order_date;

        let order = agg.orders.find((o) => o.order_id === r.order_id);
        if (!order) {
          order = {
            order_id: r.order_id,
            order_number: r.order_number,
            order_date: r.order_date,
            total: 0,
            customer_phone: phone || null,
            items: [],
          };
          agg.orders.push(order);
          agg.order_count += 1;
        }
        order.total += amt;
        order.items.push({
          product_id: r.product_id,
          product_name: r.product_name,
          quantity: qty,
          line_total: amt,
        });
      }

      // Sort orders within each customer by date desc
      for (const agg of map.values()) {
        agg.orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      }

      return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity);
    },
  });
}
