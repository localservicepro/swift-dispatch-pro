import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductSalesRow {
  customer_id: string | null;
  customer_name: string | null;
  customer_type: string | null;
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_amount: number;
  order_count: number;
  first_order: string;
  last_order: string;
}

export interface CustomerAggregate {
  customer_id: string | null;
  customer_name: string;
  customer_type: string | null;
  total_quantity: number;
  total_amount: number;
  order_count: number;
  first_order: string;
  last_order: string;
  perProduct: Record<string, number>;
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
      const { data, error } = await supabase.rpc("get_product_sales_by_customer", {
        p_product_ids: productIds,
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_customer_type: customerType && customerType !== "all" ? customerType : null,
      });
      if (error) throw error;
      const rows = (data ?? []) as ProductSalesRow[];

      // Aggregate per customer, with per-product breakdown
      const map = new Map<string, CustomerAggregate>();
      for (const r of rows) {
        const key = r.customer_id ?? `name:${r.customer_name ?? "unknown"}`;
        const existing = map.get(key);
        if (existing) {
          existing.total_quantity += Number(r.total_quantity);
          existing.total_amount += Number(r.total_amount);
          existing.order_count += Number(r.order_count);
          if (new Date(r.first_order) < new Date(existing.first_order)) existing.first_order = r.first_order;
          if (new Date(r.last_order) > new Date(existing.last_order)) existing.last_order = r.last_order;
          existing.perProduct[r.product_id] = (existing.perProduct[r.product_id] ?? 0) + Number(r.total_quantity);
        } else {
          map.set(key, {
            customer_id: r.customer_id,
            customer_name: r.customer_name ?? "Unknown",
            customer_type: r.customer_type,
            total_quantity: Number(r.total_quantity),
            total_amount: Number(r.total_amount),
            order_count: Number(r.order_count),
            first_order: r.first_order,
            last_order: r.last_order,
            perProduct: { [r.product_id]: Number(r.total_quantity) },
          });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity);
    },
  });
}
