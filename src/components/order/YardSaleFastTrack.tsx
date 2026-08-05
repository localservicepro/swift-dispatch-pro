import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ReceiptService } from "@/services/receiptService";
import {
  createYardSaleOrder,
  type YardSaleAccountCustomer,
  type YardSaleLine,
} from "./services/yardSaleService";
import { getCustomerDisplayName } from "./services/orderFormattingService";
import { Banknote, CreditCard, Minus, Plus, Trash2, UserPlus, X, Search } from "lucide-react";

interface YardProduct {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
}

interface YardSaleFastTrackProps {
  onClose: () => void;
  onCompleted?: () => void;
}

/** "3*ABC12" / "3x ABC12" / "ABC12" -> { qty, term } */
function parseEntry(raw: string): { qty: number; term: string } {
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*[*x]\s*(.+)$/i);
  if (m) return { qty: parseFloat(m[1]) || 1, term: m[2].trim() };
  return { qty: 1, term: raw.trim() };
}

function scoreProduct(p: YardProduct, term: string): number {
  const t = term.toLowerCase();
  if (p.barcode && p.barcode.toLowerCase() === t) return 100;
  if (p.sku && p.sku.toLowerCase() === t) return 90;
  if (p.name.toLowerCase() === t) return 80;
  if (p.sku && p.sku.toLowerCase().startsWith(t)) return 60;
  if (p.name.toLowerCase().startsWith(t)) return 50;
  if (p.name.toLowerCase().includes(t)) return 30;
  if (p.sku && p.sku.toLowerCase().includes(t)) return 20;
  return 0;
}

export function YardSaleFastTrack({ onClose, onCompleted }: YardSaleFastTrackProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [lines, setLines] = useState<YardSaleLine[]>([]);
  const [customer, setCustomer] = useState<YardSaleAccountCustomer | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["yard-sale-products"],
    queryFn: async (): Promise<YardProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, sku, barcode")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data as YardProduct[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const focusEntry = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    focusEntry();
  }, [focusEntry]);

  const { qty, term } = useMemo(() => parseEntry(entry), [entry]);

  const matches = useMemo(() => {
    if (!term) return products.slice(0, 8);
    return products
      .map((p) => ({ p, s: scoreProduct(p, term) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((x) => x.p);
  }, [products, term]);

  useEffect(() => {
    setHighlight(0);
  }, [entry]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines]
  );

  const addProduct = useCallback((product: YardProduct, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.id === product.id ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [
        ...prev,
        { id: product.id, name: product.name, price: product.price, quantity, sku: product.sku },
      ];
    });
    setEntry("");
    focusEntry();
  }, [focusEntry]);

  const changeQty = (id: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
    focusEntry();
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
    focusEntry();
  };

  const takePayment = useCallback(
    async (paymentMethod: string) => {
      if (submitting) return;
      if (!lines.length) {
        toast({ title: "Nothing to sell", description: "Scan or type a product first.", variant: "destructive" });
        focusEntry();
        return;
      }
      setSubmitting(true);
      try {
        const result = await createYardSaleOrder({ lines, paymentMethod, customer });
        toast({
          title: `Sale ${result.orderNumber} complete`,
          description: `AU$${result.totalAmount.toFixed(2)} • ${
            customer ? `on account — ${customer.name}` : paymentMethod === "cash" ? "Cash" : "Card"
          }`,
        });
        onCompleted?.();
        onClose();
        // Receipt generation/printing runs after the counter interaction ends.
        ReceiptService.generateReceiptFromOrder(result.orderId)
          .then(({ receiptUrl }) => ReceiptService.printReceipt(receiptUrl))
          .catch(() => {
            toast({
              title: "Receipt not printed",
              description: `Sale ${result.orderNumber} was saved. Print it from Order Management.`,
              variant: "destructive",
            });
          });
      } catch (e: any) {
        toast({ title: "Sale failed", description: e.message, variant: "destructive" });
        setSubmitting(false);
        focusEntry();
      }
    },
    [lines, customer, submitting, toast, onClose, onCompleted, focusEntry]
  );

  // Global hotkeys — the whole flow is reachable without a mouse.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        takePayment(customer ? "on_account" : "cash");
      } else if (e.key === "F2") {
        e.preventDefault();
        takePayment(customer ? "on_account" : "card");
      } else if (e.key === "F3") {
        e.preventDefault();
        setAccountOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [takePayment, customer]);

  const onEntryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = matches[highlight];
      if (picked) addProduct(picked, qty);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEntry("");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      {/* Entry + matches */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={onEntryKeyDown}
              placeholder="Scan barcode or type code / name — Enter to add (3*code for qty)"
              className="pl-9 h-14 text-lg"
            />
          </div>

          {/* Rare path: single persistent control, costs nothing when untouched */}
          <Popover open={accountOpen} onOpenChange={(o) => { setAccountOpen(o); if (!o) focusEntry(); }}>
            <PopoverTrigger asChild>
              <Button variant={customer ? "default" : "outline"} className="h-14 shrink-0">
                <UserPlus className="h-4 w-4 mr-2" />
                {customer ? customer.name : "On account"}
                <span className="ml-2 text-[10px] opacity-60">F3</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <AccountCustomerSearch
                onSelect={(c) => {
                  setCustomer(c);
                  setAccountOpen(false);
                  focusEntry();
                }}
              />
            </PopoverContent>
          </Popover>

          {customer && (
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-10 shrink-0"
              onClick={() => { setCustomer(null); focusEntry(); }}
              aria-label="Clear account customer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="rounded-xl border divide-y overflow-hidden">
          {matches.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matching product</div>
          ) : (
            matches.map((p, i) => (
              <button
                key={p.id}
                type="button"
                tabIndex={-1}
                onClick={() => addProduct(p, qty)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                  i === highlight ? "bg-accent" : "hover:bg-muted/60"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku || p.barcode || "No code"}
                  </p>
                </div>
                <span className="font-semibold whitespace-nowrap">AU${p.price.toFixed(2)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ticket */}
      <div className="rounded-xl border bg-card flex flex-col">
        <div className="p-3 flex items-center justify-between">
          <span className="font-semibold text-sm">Ticket</span>
          {customer && <Badge variant="secondary">On account</Badge>}
        </div>
        <Separator />
        <div className="flex-1 max-h-64 overflow-y-auto divide-y">
          {lines.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No items yet</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} className="p-3 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantity} × AU${l.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" tabIndex={-1} onClick={() => changeQty(l.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" tabIndex={-1} onClick={() => changeQty(l.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" tabIndex={-1} onClick={() => removeLine(l.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-semibold w-16 text-right">
                  AU${(l.price * l.quantity).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
        <Separator />
        <div className="p-3 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-3xl font-bold tabular-nums">AU${subtotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-14 text-base"
              disabled={submitting}
              onClick={() => takePayment(customer ? "on_account" : "cash")}
            >
              <Banknote className="h-5 w-5 mr-2" />
              {customer ? "Charge" : "Cash"}
              <span className="ml-1 text-[10px] opacity-70">F1</span>
            </Button>
            <Button
              variant="secondary"
              className="h-14 text-base"
              disabled={submitting}
              onClick={() => takePayment(customer ? "on_account" : "card")}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {customer ? "Charge" : "Card"}
              <span className="ml-1 text-[10px] opacity-70">F2</span>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Enter adds • F1 cash • F2 card • F3 on account
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountCustomerSearch({ onSelect }: { onSelect: (c: YardSaleAccountCustomer) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customers")
        .select("id, first_name, last_name, company_name, business_name, entity_type, customer_type, phone, full_address")
        .or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,company_name.ilike.%${term}%,business_name.ilike.%${term}%`
        )
        .limit(8);
      if (!cancelled) {
        setResults(data || []);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <div className="p-2 border-b">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account customer..."
          className="h-9"
        />
      </div>
      <div className="max-h-64 overflow-y-auto divide-y">
        {loading && <p className="p-3 text-sm text-muted-foreground">Searching...</p>}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">No customers found</p>
        )}
        {results.map((c) => (
          <button
            key={c.id}
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-muted/60"
            onClick={() =>
              onSelect({
                id: c.id,
                name: getCustomerDisplayName(c),
                phone: c.phone,
                full_address: c.full_address,
                customer_type: c.customer_type,
              })
            }
          >
            <p className="text-sm font-medium truncate">{getCustomerDisplayName(c)}</p>
            <p className="text-xs text-muted-foreground capitalize">{c.customer_type}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
