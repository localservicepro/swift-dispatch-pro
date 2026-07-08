import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpportunityCard } from "./OpportunityCard";
import { DraggableOpportunityCard } from "./DraggableOpportunityCard";
import { getCustomerTypeColors } from "@/utils/customerTypeColors";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";

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
  const stateKey = `${master.id}:${currentStage}`;

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (forceExpanded) return true;
    const stored = getStoredExpanded();
    return stored[stateKey] ?? false;
  });

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    const stored = getStoredExpanded();
    stored[stateKey] = next;
    setStoredExpanded(stored);
  };

  const colors = getCustomerTypeColors(master.customer_type);
  const splitTotals = splits.reduce((sum, split) => sum + calculateDisplayTotal(split), 0);
  const displayedCombinedTotal = splitTotals > 0 ? splitTotals : calculateDisplayTotal(master);

  return (
    <div className="space-y-2">
      {/* Master rendered as full card */}
      <OpportunityCard
        order={master}
        currentStage={currentStage}
        onOrderMove={onOrderMove}
        onOrderClick={onOrderClick}
      />

      {/* Splits summary strip */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-xs transition-colors hover:bg-black/[0.03]",
          colors.card,
          colors.border,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          )}
          <Split className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <Badge variant="outline" className="bg-white/70 text-xs">
            {splits.length} {splits.length === 1 ? "split" : "splits"}
          </Badge>
          <span className="text-slate-600 truncate">
            {expanded ? "Hide" : "Show"} split orders
          </span>
        </div>
        <span className="text-xs font-semibold text-green-700 flex-shrink-0">
          Combined: ${(displayedCombinedTotal || combinedTotal).toFixed(0)}
        </span>
      </button>

      {/* Expanded split children */}
      {expanded && (
        <div className="space-y-2 pl-3 border-l-2 border-dashed border-slate-300 ml-2">
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
    </div>
  );
}
