import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderCard } from "./OrderCard";
import { getCustomerTypeColors } from "@/utils/customerTypeColors";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  company_name?: string;
  business_name?: string;
  customer_type?: string;
  total_amount: number;
  status: OrderStatus;
  master_order_id?: string | null;
  is_split_order?: boolean | null;
  [key: string]: any;
}

interface SplitOrderGroupCardProps {
  master: Order;
  splits: Order[];
  combinedTotal: number;
  forceExpanded?: boolean;
  onEdit: (order: any) => void;
  onDelete: (order: any) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, currentOrder: any) => void;
  onNotesEdit: (order: any) => void;
  onPaymentStatusUpdate?: () => void;
}

const STORAGE_KEY = "swiftdispatch.splitGroup.expanded";

function getStoredExpanded(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredExpanded(state: Record<string, boolean>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function SplitOrderGroupCard({
  master,
  splits,
  forceExpanded,
  onEdit,
  onDelete,
  onStatusUpdate,
  onNotesEdit,
  onPaymentStatusUpdate,
}: SplitOrderGroupCardProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (forceExpanded) return true;
    const stored = getStoredExpanded();
    return stored[master.id] ?? false;
  });

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    const stored = getStoredExpanded();
    stored[master.id] = next;
    setStoredExpanded(stored);
  };

  const colors = getCustomerTypeColors(master.customer_type);
  const splitTotals = splits.reduce((sum, split) => sum + calculateDisplayTotal(split), 0);
  const displayedCombinedTotal = splitTotals > 0 ? splitTotals : calculateDisplayTotal(master);

  return (
    <div className="space-y-2">
      {/* Master rendered as a full order card */}
      <OrderCard
        order={master as any}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusUpdate={onStatusUpdate}
        onNotesEdit={onNotesEdit}
        onPaymentStatusUpdate={onPaymentStatusUpdate}
      />

      {/* Splits summary strip */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border text-sm transition-colors hover:bg-black/[0.03]",
          colors.card,
          colors.border,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <Split className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <Badge variant="outline" className="bg-white/70">
            {splits.length} {splits.length === 1 ? "split" : "splits"}
          </Badge>
          <span className="text-slate-600">
            {expanded ? "Hide" : "Show"} split orders
          </span>
        </div>
        <span className="text-sm font-semibold text-green-700 flex-shrink-0">
          Combined: ${displayedCombinedTotal.toFixed(2)}
        </span>
      </button>

      {/* Expanded split children */}
      {expanded && (
        <div className="space-y-3 pl-4 border-l-2 border-dashed border-slate-300 ml-2">
          {splits.map((split) => (
            <OrderCard
              key={split.id}
              order={split as any}
              variant="nested"
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusUpdate={onStatusUpdate}
              onNotesEdit={onNotesEdit}
              onPaymentStatusUpdate={onPaymentStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
