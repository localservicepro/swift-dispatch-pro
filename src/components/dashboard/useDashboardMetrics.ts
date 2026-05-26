import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RangeKey = "today" | "7d" | "30d";

export interface Kpis {
  ordersCount: number;
  revenue: number;
  aov: number;
  deliveredCount: number;
  inTransitCount: number;
  unpaidCount: number;
  unpaidAmount: number;
}

export interface KpiDelta {
  ordersCount: number;
  revenue: number;
  aov: number;
  deliveredCount: number;
}

export interface TodayOps {
  scheduled: number;
  delivered: number;
  overdue: number;
}

export interface TypeMixRow {
  type: string; // Account | Trade | Residential | Other
  count: number;
  revenue: number;
  aov: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  type: string | null;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface StatusSlice {
  name: string;
  value: number;
  color: string;
}

export interface Fleet {
  activeDrivers: number;
  trucksTotal: number;
  trucksAssignedToday: number;
  onTimePct: number | null;
}

function startOfRange(range: RangeKey): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "today") return d;
  const days = range === "7d" ? 6 : 29;
  d.setDate(d.getDate() - days);
  return d;
}

function priorRange(range: RangeKey): { start: Date; end: Date } {
  const start = startOfRange(range);
  const end = new Date(start);
  const length = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const priorStart = new Date(start);
  priorStart.setDate(priorStart.getDate() - length);
  return { start: priorStart, end };
}

function pct(curr: number, prev: number): number {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function statusColor(s: string): string {
  switch (s) {
    case "delivered": return "hsl(160 70% 40%)";
    case "en_route": return "hsl(210 80% 55%)";
    case "loading": return "hsl(220 70% 50%)";
    case "preparing": return "hsl(40 90% 55%)";
    case "cancelled": return "hsl(0 75% 55%)";
    case "requested": return "hsl(260 60% 60%)";
    default: return "hsl(215 15% 55%)";
  }
}

function customerDisplay(c: any): string {
  if (!c) return "Unknown";
  if (c.customer_type === "account" && c.company_name) return c.company_name;
  if (c.entity_type === "business" && c.business_name) return c.business_name;
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || c.business_name || "Unknown";
}

function typeLabel(t: string | null | undefined): string {
  if (t === "account") return "Account";
  if (t === "business") return "Trade";
  if (t === "residential") return "Residential";
  return "Other";
}

export function useDashboardMetrics(range: RangeKey) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({
    ordersCount: 0, revenue: 0, aov: 0, deliveredCount: 0,
    inTransitCount: 0, unpaidCount: 0, unpaidAmount: 0,
  });
  const [delta, setDelta] = useState<KpiDelta>({ ordersCount: 0, revenue: 0, aov: 0, deliveredCount: 0 });
  const [todayOps, setTodayOps] = useState<TodayOps>({ scheduled: 0, delivered: 0, overdue: 0 });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [statusDist, setStatusDist] = useState<StatusSlice[]>([]);
  const [typeMix, setTypeMix] = useState<TypeMixRow[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [fleet, setFleet] = useState<Fleet>({ activeDrivers: 0, trucksTotal: 0, trucksAssignedToday: 0, onTimePct: null });

  const load = useCallback(async () => {
    setLoading(true);
    const rangeStart = startOfRange(range);
    const prior = priorRange(range);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);
    const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);

    const [
      currentRes, priorRes, unpaidRes, scheduledRes, overdueRes,
      thirtyRes, thirtyItemsRes, productsRes, customersRes, trucksRes, deliveredTodayRes,
    ] = await Promise.all([
      supabase.from("orders").select("status,total_amount,created_at,customer_id,delivery_date,updated_at,driver_id,truck_id").is("deleted_at", null).gte("created_at", rangeStart.toISOString()),
      supabase.from("orders").select("status,total_amount,created_at").is("deleted_at", null).gte("created_at", prior.start.toISOString()).lt("created_at", prior.end.toISOString()),
      supabase.from("invoices").select("amount").eq("status", "pending"),
      supabase.from("orders").select("id").is("deleted_at", null).eq("delivery_date", todayIso),
      supabase.from("orders").select("id,status,delivery_date").is("deleted_at", null).lt("delivery_date", todayIso).not("status", "in", "(delivered,cancelled)"),
      supabase.from("orders").select("id,customer_id,total_amount").is("deleted_at", null).gte("created_at", thirty.toISOString()).neq("status", "cancelled"),
      supabase.from("order_items").select("product_id,quantity,total_price,orders!inner(created_at,status,deleted_at)").gte("orders.created_at", thirty.toISOString()),
      supabase.from("products").select("id,name"),
      supabase.from("customers").select("id,first_name,last_name,company_name,business_name,customer_type,entity_type"),
      supabase.from("trucks").select("id"),
      supabase.from("orders").select("id,delivery_date,updated_at").is("deleted_at", null).eq("status", "delivered").gte("updated_at", today.toISOString()),
    ]);

    const cur = currentRes.data || [];
    const prv = priorRes.data || [];
    const customers = customersRes.data || [];
    const customerById = new Map(customers.map((c: any) => [c.id, c]));
    const products = productsRes.data || [];
    const productById = new Map(products.map((p: any) => [p.id, p.name as string]));

    const nonCancelled = cur.filter((o: any) => o.status !== "cancelled");
    const ordersCount = nonCancelled.length;
    const revenue = nonCancelled.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const aov = ordersCount ? revenue / ordersCount : 0;
    const deliveredCount = cur.filter((o: any) => o.status === "delivered").length;
    const inTransitCount = cur.filter((o: any) => o.status === "en_route" || o.status === "loading").length;

    const unpaidArr = unpaidRes.data || [];
    const unpaidAmount = unpaidArr.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    const prvNon = prv.filter((o: any) => o.status !== "cancelled");
    const prvRevenue = prvNon.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const prvAov = prvNon.length ? prvRevenue / prvNon.length : 0;

    setKpis({
      ordersCount, revenue, aov, deliveredCount, inTransitCount,
      unpaidCount: unpaidArr.length, unpaidAmount,
    });
    setDelta({
      ordersCount: pct(ordersCount, prvNon.length),
      revenue: pct(revenue, prvRevenue),
      aov: pct(aov, prvAov),
      deliveredCount: pct(deliveredCount, prv.filter((o: any) => o.status === "delivered").length),
    });

    setTodayOps({
      scheduled: scheduledRes.data?.length || 0,
      delivered: deliveredTodayRes.data?.length || 0,
      overdue: overdueRes.data?.length || 0,
    });

    // Trend
    const buckets = range === "today" ? 24 : range === "7d" ? 7 : 30;
    const trendArr: TrendPoint[] = Array.from({ length: buckets }, (_, i) => {
      if (range === "today") {
        return { label: `${i}:00`, revenue: 0, orders: 0 };
      }
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (buckets - 1 - i));
      return {
        label: range === "7d"
          ? d.toLocaleDateString("en", { weekday: "short" })
          : `${d.getDate()}/${d.getMonth() + 1}`,
        revenue: 0,
        orders: 0,
      };
    });
    for (const o of nonCancelled) {
      const d = new Date(o.created_at);
      let idx: number;
      if (range === "today") {
        idx = d.getHours();
      } else {
        const day = new Date(d); day.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - day.getTime()) / 86400000);
        idx = buckets - 1 - diff;
      }
      if (idx >= 0 && idx < buckets) {
        trendArr[idx].revenue += Number(o.total_amount || 0);
        trendArr[idx].orders += 1;
      }
    }
    setTrend(trendArr);

    // Status distribution (current window, includes cancelled to show full breakdown)
    const statusMap = new Map<string, number>();
    for (const o of cur) statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    setStatusDist(Array.from(statusMap.entries()).map(([s, v]) => ({
      name: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: v,
      color: statusColor(s),
    })));

    // Type mix
    const typeAgg = new Map<string, { count: number; revenue: number }>();
    for (const o of nonCancelled) {
      const c = customerById.get(o.customer_id);
      const label = typeLabel(c?.customer_type);
      const prev = typeAgg.get(label) || { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += Number(o.total_amount || 0);
      typeAgg.set(label, prev);
    }
    setTypeMix(["Account", "Trade", "Residential", "Other"]
      .filter((t) => typeAgg.has(t))
      .map((t) => {
        const v = typeAgg.get(t)!;
        return { type: t, count: v.count, revenue: v.revenue, aov: v.count ? v.revenue / v.count : 0 };
      }));

    // Top customers (30d)
    const thirtyOrders = thirtyRes.data || [];
    const custAgg = new Map<string, { revenue: number; orders: number }>();
    for (const o of thirtyOrders) {
      if (!o.customer_id) continue;
      const prev = custAgg.get(o.customer_id) || { revenue: 0, orders: 0 };
      prev.revenue += Number(o.total_amount || 0);
      prev.orders += 1;
      custAgg.set(o.customer_id, prev);
    }
    setTopCustomers(
      Array.from(custAgg.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([id, v]) => {
          const c: any = customerById.get(id);
          return {
            id,
            name: customerDisplay(c),
            type: typeLabel(c?.customer_type),
            revenue: v.revenue,
            orders: v.orders,
          };
        })
    );

    // Top products (30d)
    const items = thirtyItemsRes.data || [];
    const prodAgg = new Map<string, { qty: number; revenue: number }>();
    for (const it of items as any[]) {
      if (!it.product_id) continue;
      if (it.orders?.status === "cancelled" || it.orders?.deleted_at) continue;
      const prev = prodAgg.get(it.product_id) || { qty: 0, revenue: 0 };
      prev.qty += Number(it.quantity || 0);
      prev.revenue += Number(it.total_price || 0);
      prodAgg.set(it.product_id, prev);
    }
    setTopProducts(
      Array.from(prodAgg.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([id, v]) => ({ id, name: productById.get(id) || "Unknown product", qty: v.qty, revenue: v.revenue }))
    );

    // Fleet
    const todayOrdersAll = cur.filter((o: any) => o.delivery_date === todayIso);
    const activeDrivers = new Set(todayOrdersAll.map((o: any) => o.driver_id).filter(Boolean)).size;
    const trucksAssignedToday = new Set(todayOrdersAll.map((o: any) => o.truck_id).filter(Boolean)).size;
    const trucksTotal = trucksRes.data?.length || 0;
    // On-time = delivered today with delivery_date <= today
    const dt = deliveredTodayRes.data || [];
    const onTime = dt.filter((o: any) => o.delivery_date && o.delivery_date <= todayIso).length;
    const onTimePct = dt.length ? (onTime / dt.length) * 100 : null;
    setFleet({ activeDrivers, trucksTotal, trucksAssignedToday, onTimePct });

    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { loading, kpis, delta, todayOps, trend, statusDist, typeMix, topCustomers, topProducts, fleet, reload: load };
}
