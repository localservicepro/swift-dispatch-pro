import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Split, Building, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpportunityCard } from "./OpportunityCard";
import { DraggableOpportunityCard } from "./DraggableOpportunityCard";
import { formatOrderNumber } from "@/utils/orderNumberFormatter";
import { cleanDisplayName } from "../order/services/orderFormattingService";
import { getCustomerTypeColors } from "@/utils/customerTypeColors";

interface SplitOpportunityGroupCardProps {
  master: any;
  splits: any[];
  combinedTotal: number;
  currentStage: string;
  draggable?: boolean;
  forceExpanded?: boolean;
  onOrderMove: () => void;
  onOrderClick: (order: any) => void;
}

const STORAGE_KEY = "swiftdispatch.splitGroup.opportunity.expanded";

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

export function SplitOpportunityGroupCard({
  master,
  splits,
  combinedTotal,
  currentStage,
  draggable = false,
  forceExpanded,
  onOrderMove,
  onOrderClick,
}: SplitOpportunityGroupCardProps) {
  // Unique key per stage so an order collapsed in one column
  // doesn't affect its siblings elsewhere.
  const stateKey = `${master.id}:${currentStage}`;

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (forceExpanded) return true;
    const stored = getStoredExpanded();
    return stored[stateKey] ?? false;
  });

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    const stored = getStoredExpanded();
    stored[stateKey] = next;
    setStoredExpanded(stored);
  };

  const colors = getCustomerTypeColors(master.customer_type);

  const displayName =
    cleanDisplayName(master.company_name) ||
    cleanDisplayName(master.business_name) ||
    cleanDisplayName(master.customer_name) ||
    "Customer";
  const isCompany = !!(cleanDisplayName(master.company_name) || cleanDisplayName(master.business_name));

  return (
    <Card
      className={cn(
        "transition-all",
        colors.card,
        colors.border,
        colors.leftBorder,
      )}
    >
      <CardContent className="p-3 space-y-3">
        <button
          type="button"
          onClick={toggle}
          className="w-full text-left flex items-start justify-between gap-2"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              <Split className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="font-semibold text-sm text-slate-800 truncate">
                {formatOrderNumber(master)}
              </span>
              <Badge variant="outline" className="bg-white/70 text-xs">
                {splits.length} splits
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-600 mt-1 pl-6">
              {isCompany ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
              <span className="font-medium truncate">{displayName}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-green-600 flex-shrink-0">
            ${combinedTotal.toFixed(0)}
          </span>
        </button>

        {expanded && (
          <div className="space-y-2 pl-2 border-l-2 border-dashed border-slate-200">
            {splits.map((split) =>
              draggable ? (
                <DraggableOpportunityCard
                  key={split.id}
                  order={split}
                  currentStage={currentStage}
                  onOrderMove={onOrderMove}
                  onOrderClick={onOrderClick}
                />
              ) : (
                <OpportunityCard
                  key={split.id}
                  order={split}
                  currentStage={currentStage}
                  onOrderMove={onOrderMove}
                  onOrderClick={onOrderClick}
                />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
