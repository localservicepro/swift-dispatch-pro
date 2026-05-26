import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Package, Truck, CheckCircle, DollarSign, AlertTriangle, ShoppingCart, RefreshCw,
  TrendingUp, TrendingDown, Minus, CalendarClock, Clock, Users, Boxes, Wallet, Activity,
} from "lucide-react";
import { ProductEditDialog } from "./product/ProductEditDialog";
import { useDashboardMetrics, RangeKey } from "./dashboard/useDashboardMetrics";

interface StockAlert {
  id: string;
  name: string;
  stock_quantity: number;
  sku: string;
  description: string | null;
  price: number;
  barcode: string | null;
  weight: number | null;
  dimensions: string | null;
  is_active: boolean;
  category_id: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  product_type?: string;
  category?: { name: string };
}

interface Category { id: string; name: string; description: string | null; is_active: boolean; }
interface RecentOrder {
  id: string; order_number: string; customer_name: string;
  company_name?: string; business_name?: string; customer_type?: string;
  status: string; total_amount: number; created_at: string;
}

const fmtAUD = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const fmtAUD2 = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("en-AU").format(n);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

function DeltaChip({ value, invert = false }: { value: number; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const Icon = value === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const color = value === 0
    ? "text-slate-400 bg-slate-100"
    : positive
      ? "text-emerald-700 bg-emerald-50"
      : "text-rose-700 bg-rose-50";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

function KpiCard({ label, value, sub, delta, icon: Icon, accent }: {
  label: string; value: string; sub?: string; delta?: number; icon: any; accent?: string;
}) {
  return (
    <Card className="border-slate-200 bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-medium">
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{label}</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-800 tabular-nums tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              {value}
            </div>
            {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
          </div>
          {delta !== undefined && <DeltaChip value={delta} />}
        </div>
        {accent && <div className={`mt-3 h-0.5 rounded-full ${accent}`} />}
      </CardContent>
    </Card>
  );
}

function RangeToggle({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  const opts: { v: RangeKey; l: string }[] = [
    { v: "today", l: "Today" },
    { v: "7d", l: "7 days" },
    { v: "30d", l: "30 days" },
  ];
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === o.v ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function statusBadgeClass(s: string): string {
  switch (s) {
    case "delivered": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "en_route": return "bg-sky-50 text-sky-700 border-sky-200";
    case "loading": return "bg-blue-50 text-blue-700 border-blue-200";
    case "preparing": return "bg-amber-50 text-amber-700 border-amber-200";
    case "cancelled": return "bg-rose-50 text-rose-700 border-rose-200";
    case "requested": return "bg-violet-50 text-violet-700 border-violet-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function DashboardOverview() {
  const [range, setRange] = useState<RangeKey>("7d");
  const m = useDashboardMetrics(range);
  const { toast } = useToast();

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<StockAlert | null>(null);

  useEffect(() => {
    void loadRecentOrders();
    void loadStockAlerts();
    void loadCategories();
    const ch = supabase.channel("dashboard-side")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadRecentOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadStockAlerts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadRecentOrders() {
    const { data } = await supabase
      .from("orders")
      .select(`id, order_number, customer_name, status, total_amount, created_at,
        customers!orders_customer_id_fkey(company_name, business_name, customer_type)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    setRecentOrders((data || []).map((o: any) => ({
      ...o,
      company_name: o.customers?.company_name,
      business_name: o.customers?.business_name,
      customer_type: o.customers?.customer_type,
    })));
  }
  async function loadStockAlerts() {
    const { data } = await supabase
      .from("products")
      .select(`id, name, stock_quantity, sku, description, price, barcode, weight,
        dimensions, is_active, category_id, images, created_at, updated_at,
        product_type, category:product_categories(name)`)
      .eq("is_active", true).lte("stock_quantity", 10).order("stock_quantity", { ascending: true }).limit(8);
    setStockAlerts(data || []);
  }
  async function loadCategories() {
    const { data } = await supabase.from("product_categories").select("id,name,description,is_active").eq("is_active", true).order("name");
    setCategories(data || []);
  }

  const customerName = (o: RecentOrder) => {
    if (o.customer_type === "account" && o.company_name) return o.company_name;
    if (o.customer_type === "business" && o.business_name) return o.business_name;
    return o.customer_name || "Unknown";
  };

  const typeAccent: Record<string, string> = {
    Account: "bg-emerald-500",
    Trade: "bg-sky-500",
    Residential: "bg-slate-400",
    Other: "bg-slate-300",
  };

  if (m.loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Live operations overview · {fmtDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangeToggle value={range} onChange={setRange} />
          <Button onClick={m.reload} variant="outline" size="sm" className="border-slate-200">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard label="Orders" value={fmtNum(m.kpis.ordersCount)} delta={m.delta.ordersCount} icon={Package} accent="bg-slate-800" />
        <KpiCard label="Revenue" value={fmtAUD(m.kpis.revenue)} delta={m.delta.revenue} icon={DollarSign} accent="bg-emerald-500" />
        <KpiCard label="Avg Order" value={fmtAUD(m.kpis.aov)} delta={m.delta.aov} icon={Activity} accent="bg-sky-500" />
        <KpiCard label="Delivered" value={fmtNum(m.kpis.deliveredCount)} delta={m.delta.deliveredCount} icon={CheckCircle} accent="bg-emerald-400" />
        <KpiCard label="In Transit" value={fmtNum(m.kpis.inTransitCount)} icon={Truck} accent="bg-blue-500" />
        <KpiCard label="Unpaid" value={fmtAUD(m.kpis.unpaidAmount)} sub={`${m.kpis.unpaidCount} invoice${m.kpis.unpaidCount === 1 ? "" : "s"}`} icon={Wallet} accent="bg-rose-500" />
      </div>

      {/* Today's ops strip */}
      <Card className="border-slate-200 bg-gradient-to-br from-slate-800 to-slate-700 text-slate-50">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10"><CalendarClock className="w-5 h-5" /></div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-300">Today</div>
              <div className="text-sm font-medium">{fmtDate(new Date().toISOString())}</div>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-300">Scheduled</div>
            <div className="text-2xl font-bold tabular-nums">{fmtNum(m.todayOps.scheduled)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-300">Delivered today</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-300">{fmtNum(m.todayOps.delivered)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-300">Overdue</div>
            <div className={`text-2xl font-bold tabular-nums ${m.todayOps.overdue > 0 ? "text-rose-300" : "text-slate-200"}`}>
              {fmtNum(m.todayOps.overdue)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Revenue trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={m.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(215 25% 30%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(215 25% 30%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(215 15% 92%)" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(215 15% 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215 15% 55%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip formatter={(v: any) => fmtAUD2(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid hsl(215 15% 88%)", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(215 25% 27%)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Status mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={m.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {m.statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(215 15% 88%)", fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type mix + Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Customer-type mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.typeMix.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No orders in window</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {m.typeMix.map((t) => (
                  <div key={t.type} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${typeAccent[t.type] || "bg-slate-300"}`} />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.type}</span>
                    </div>
                    <div className="mt-2 text-xl font-bold text-slate-800 tabular-nums">{fmtAUD(t.revenue)}</div>
                    <div className="mt-1 text-xs text-slate-500">{fmtNum(t.count)} orders · AOV {fmtAUD(t.aov)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Fleet today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Active drivers</span>
              <span className="text-lg font-bold text-slate-800 tabular-nums">{m.fleet.activeDrivers}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Trucks assigned</span>
              <span className="text-lg font-bold text-slate-800 tabular-nums">{m.fleet.trucksAssignedToday} / {m.fleet.trucksTotal}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-700" style={{ width: `${m.fleet.trucksTotal ? Math.min(100, (m.fleet.trucksAssignedToday / m.fleet.trucksTotal) * 100) : 0}%` }} />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500">On-time today</span>
              <span className="text-lg font-bold text-emerald-600 tabular-nums">
                {m.fleet.onTimePct === null ? "—" : `${m.fleet.onTimePct.toFixed(0)}%`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top customers + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Top customers <span className="text-[10px] font-normal text-slate-400">· 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.topCustomers.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No data</div>
            ) : (
              <ol className="space-y-2">
                {m.topCustomers.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.type} · {c.orders} orders</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 tabular-nums">{fmtAUD(c.revenue)}</div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Boxes className="w-4 h-4" /> Top products <span className="text-[10px] font-normal text-slate-400">· 30 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.topProducts.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No data</div>
            ) : (
              <ol className="space-y-2">
                {m.topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500">{fmtNum(p.qty)} sold</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 tabular-nums">{fmtAUD(p.revenue)}</div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Recent orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{o.order_number}</div>
                      <div className="text-xs text-slate-500 truncate">{customerName(o)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(o.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-slate-800 tabular-nums">{fmtAUD2(o.total_amount)}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadgeClass(o.status)}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Stock alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockAlerts.length === 0 ? (
              <p className="text-sm text-emerald-600 text-center py-4">All products well stocked</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {stockAlerts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setEditingProduct(p)}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-md border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                      {p.sku && <div className="text-xs text-slate-500">SKU: {p.sku}</div>}
                    </div>
                    <Badge variant={p.stock_quantity === 0 ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                      {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} left`}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingProduct && (
        <ProductEditDialog
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            loadStockAlerts();
            toast({ title: "Product updated", description: "Product has been saved." });
          }}
        />
      )}
    </div>
  );
}
