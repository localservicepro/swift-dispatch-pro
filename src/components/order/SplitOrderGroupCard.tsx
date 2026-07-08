import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Split, Building, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderCard } from "./OrderCard";
import { formatOrderNumber } from "@/utils/orderNumberFormatter";
import { cleanDisplayName } from "./services/orderFormattingService";
import { getCustomerTypeColors } from "@/utils/customerTypeColors";
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

const STATUS_LABEL: Record<string, string> = {
  preparing: "Preparing",
  loading: "Loading",
  en_route: "En Route",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  preparing: "bg-yellow-100 text-yellow-800",
  loading: "bg-orange-100 text-orange-800",
  en_route: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function SplitOrderGroupCard({
  master,
  splits,
  combinedTotal,
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

  const displayName =
    cleanDisplayName(master.company_name) ||
    cleanDisplayName(master.business_name) ||
    cleanDisplayName(master.customer_name) ||
    "Customer";
  const isCompany = !!(cleanDisplayName(master.company_name) || cleanDisplayName(master.business_name));

  // Aggregate split statuses
  const statusCounts = splits.reduce<Record<string, number>>((acc, s) => {
    const k = String(s.status);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const uniqueStatuses = Object.keys(statusCounts);
  const allSameStatus = uniqueStatuses.length === 1;

  return (
    <div
      className={cn(
        "border-2 rounded-lg transition-colors",
        colors.card,
        colors.border,
        colors.leftBorder,
      )}
    >
      {/* Master header */}
      <button
        type="button"
        onClick={toggle}
        className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-black/[0.02]"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Split className="w-4 h-4 text-slate-500" />
            {formatOrderNumber(master)}
          </h3>
          <Badge variant="outline" className="bg-white/70">
            {splits.length} {splits.length === 1 ? "split" : "splits"}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-slate-600">
            {isCompany ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
            <span className="font-medium">{displayName}</span>
          </div>
          {allSameStatus ? (
            <Badge className={STATUS_COLOR[uniqueStatuses[0]] || "bg-gray-100 text-gray-800"}>
              {STATUS_LABEL[uniqueStatuses[0]] || uniqueStatuses[0]}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-700">
              Mixed status
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-lg font-bold text-green-600">
            ${combinedTotal.toFixed(2)}
          </span>
        </div>
      </button>

      {/* Expanded splits */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-white/50">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
            Split orders
          </div>
          <div className="space-y-3 pl-2 border-l-2 border-dashed border-slate-200">
            {splits.map((split) => (
              <div key={split.id} className="pl-3">
                <OrderCard
                  order={split as any}
                  variant="nested"
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusUpdate={onStatusUpdate}
                  onNotesEdit={onNotesEdit}
                  onPaymentStatusUpdate={onPaymentStatusUpdate}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" variant="ghost" onClick={() => onEdit(master as any)}>
              View master order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
