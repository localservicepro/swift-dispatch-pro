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
  onEdit,
  onDelete,
  onStatusUpdate,
  onNotesEdit,
  onPaymentStatusUpdate,
}: SplitOrderGroupCardProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    const stored = getStoredExpanded();
    return stored[master.id] ?? false;
  });

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

      {/* Splits summary banner */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group relative w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-amber-300",
          "bg-gradient-to-r from-amber-50 via-amber-100/70 to-orange-50",
          "shadow-sm hover:shadow-md hover:from-amber-100 hover:to-orange-100 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-amber-400"
        )}
        aria-expanded={expanded}
      >
        {/* Connector notch to master card */}
        <span className="absolute -top-[9px] left-6 w-3 h-3 rotate-45 bg-amber-50 border-l-2 border-t-2 border-dashed border-amber-300" />

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ring-2 ring-white">
            <Split className="w-4.5 h-4.5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Split Order
              </span>
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 px-2 py-0 text-xs font-semibold">
                {splits.length} {splits.length === 1 ? "part" : "parts"}
              </Badge>
            </div>
            <span className="text-xs text-amber-800/80 font-medium">
              {expanded ? "Hide" : "Click to reveal"} split order details
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-amber-700/70 font-semibold leading-none">
              Combined
            </span>
            <span className="text-base font-bold text-green-700 leading-tight">
              ${displayedCombinedTotal.toFixed(2)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/80 border border-amber-300 flex items-center justify-center group-hover:bg-white transition-colors">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
            )}
          </div>
        </div>
      </button>

      {/* Expanded split children */}
      {expanded && (
        <div className="space-y-3 pl-4 border-l-2 border-dashed border-amber-400 ml-4 pt-1">
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
