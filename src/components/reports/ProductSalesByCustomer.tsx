import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Download, Loader2, PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductMultiSelect } from "./ProductMultiSelect";
import { DateRangePresetPicker, getPresetRange, type DateRange } from "./DateRangePresetPicker";
import { useProductSalesReport } from "@/hooks/useProductSalesReport";
import { getCustomerTypeColors, getCustomerTypeLabel } from "@/utils/customerTypeColors";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { OrderQuickViewLoader } from "./OrderQuickViewLoader";

const formatNumber = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 3 });
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const formatDate = (iso: string) => format(new Date(iso), "dd/MM/yyyy");

export function ProductSalesByCustomer() {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [range, setRange] = useState<DateRange>(getPresetRange("last30"));
  const [customerType, setCustomerType] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: productsMeta = [] } = useQuery({
    queryKey: ["products-meta-for-report", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .in("id", productIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading, isFetching, error } = useProductSalesReport({
    productIds,
    start: range.start,
    end: range.end,
    customerType,
  });

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.qty += r.total_quantity;
        acc.spend += r.total_amount;
        acc.orders += r.order_count;
        return acc;
      },
      { qty: 0, spend: 0, orders: 0 },
    );
  }, [rows]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      toast({ title: "Nothing to export", description: "No results in current filter." });
      return;
    }
    const headers = [
      "Customer",
      "Business Name",
      "Phone",
      "Type",
      "Total Qty",
      ...productsMeta.map((p) => p.name),
      "Orders",
      "Order Numbers",
      "First Order",
      "Last Order",
      "Spend (AUD)",
    ];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      const orderNumbers = r.orders.map((o) => o.order_number).join("; ");
      const cells = [
        `"${(r.customer_name ?? "").replace(/"/g, '""')}"`,
        `"${(r.business_name ?? "").replace(/"/g, '""')}"`,
        `"${r.phones.join("; ")}"`,
        getCustomerTypeLabel(r.customer_type),
        formatNumber(r.total_quantity),
        ...productsMeta.map((p) => formatNumber(r.perProduct[p.id] ?? 0)),
        r.order_count,
        `"${orderNumbers}"`,
        formatDate(r.first_order),
        formatDate(r.last_order),
        r.total_amount.toFixed(2),
      ];
      csvRows.push(cells.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-sales-${format(range.start, "yyyyMMdd")}-${format(range.end, "yyyyMMdd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setProductIds([]);
    setRange(getPresetRange("last30"));
    setCustomerType("all");
    setExpanded(new Set());
  };

  const colSpan = 9 + productsMeta.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Sales by Customer</h1>
          <p className="text-sm text-muted-foreground">
            See who bought selected products, how many, and total spend within a date range.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={rows.length === 0} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Date range</label>
            <DateRangePresetPicker value={range} onChange={setRange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Products</label>
              <ProductMultiSelect value={productIds} onChange={setProductIds} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Customer type</label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={reset}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Results</span>
            <span className="text-sm font-normal text-muted-foreground">
              {rows.length} customer{rows.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productIds.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <PackageSearch className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Select one or more products to run the report.
            </div>
          ) : isLoading || isFetching ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              Failed to load report. {(error as Error).message}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No purchases found for the selected products and date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-2 py-2 w-8" />
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Phone</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium text-right">Total Qty</th>
                    {productsMeta.map((p) => (
                      <th key={p.id} className="px-3 py-2 font-medium text-right whitespace-nowrap">
                        {p.name}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium text-right">Orders</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">First Order</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Last Order</th>
                    <th className="px-3 py-2 font-medium text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const colors = getCustomerTypeColors(r.customer_type);
                    const key = r.customer_id ?? `name:${r.customer_name}`;
                    const isOpen = expanded.has(key);
                    return (
                      <Fragment key={key}>
                        <tr className={cn("border-b", colors.leftBorder)}>
                          <td className="px-2 py-2 align-top">
                            <button
                              type="button"
                              onClick={() => toggleExpand(key)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground"
                              aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-3 py-2 font-medium">
                            <div>{r.display_name}</div>
                            {r.entity_type === "business" && r.business_name && r.customer_name && r.customer_name !== r.business_name && (
                              <div className="text-xs text-muted-foreground font-normal">{r.customer_name}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums text-xs">
                            {r.phones.length > 0 ? r.phones.join(", ") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary">{getCustomerTypeLabel(r.customer_type)}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{formatNumber(r.total_quantity)}</td>
                          {productsMeta.map((p) => (
                            <td key={p.id} className="px-3 py-2 text-right tabular-nums">
                              {formatNumber(r.perProduct[p.id] ?? 0)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right tabular-nums">{r.order_count}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.first_order)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.last_order)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.total_amount)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b bg-muted/20">
                            <td />
                            <td colSpan={colSpan - 1} className="px-3 py-3">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                Matching orders ({r.orders.length})
                              </div>
                              <table className="w-full text-sm">
                                <thead className="text-left text-xs text-muted-foreground">
                                  <tr>
                                    <th className="px-2 py-1 font-medium">Order #</th>
                                    <th className="px-2 py-1 font-medium">Date</th>
                                    <th className="px-2 py-1 font-medium whitespace-nowrap">Phone</th>
                                    <th className="px-2 py-1 font-medium">Items (selected products)</th>
                                    <th className="px-2 py-1 font-medium text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.orders.map((o) => (
                                    <tr key={o.order_id} className="border-t border-border/50">
                                      <td className="px-2 py-1.5 align-top">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedOrderId(o.order_id)}
                                          className="text-primary hover:underline font-medium"
                                        >
                                          {o.order_number}
                                        </button>
                                      </td>
                                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                                        {formatDate(o.order_date)}
                                      </td>
                                      <td className="px-2 py-1.5 align-top whitespace-nowrap tabular-nums text-xs">
                                        {o.customer_phone || <span className="text-muted-foreground">—</span>}
                                      </td>
                                    <tr key={o.order_id} className="border-t border-border/50">
                                      <td className="px-2 py-1.5 align-top">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedOrderId(o.order_id)}
                                          className="text-primary hover:underline font-medium"
                                        >
                                          {o.order_number}
                                        </button>
                                      </td>
                                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                                        {formatDate(o.order_date)}
                                      </td>
                                      <td className="px-2 py-1.5 align-top">
                                        <div className="flex flex-wrap gap-1">
                                          {o.items.map((it, idx) => (
                                            <span
                                              key={`${o.order_id}-${it.product_id}-${idx}`}
                                              className="inline-flex items-center gap-1 rounded bg-background border px-1.5 py-0.5 text-xs"
                                            >
                                              <span className="font-medium">{formatNumber(it.quantity)}×</span>
                                              <span className="text-muted-foreground">{it.product_name}</span>
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 align-top text-right tabular-nums">
                                        {formatCurrency(o.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td />
                    <td className="px-3 py-2" colSpan={3}>Totals</td>
                    <td className="px-3 py-2 text-right">{formatNumber(totals.qty)}</td>
                    {productsMeta.map((p) => {
                      const sum = rows.reduce((s, r) => s + (r.perProduct[p.id] ?? 0), 0);
                      return (
                        <td key={p.id} className="px-3 py-2 text-right tabular-nums">
                          {formatNumber(sum)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">{totals.orders}</td>
                    <td className="px-3 py-2" colSpan={2} />
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.spend)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrderId && (
        <OrderQuickViewLoader
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
