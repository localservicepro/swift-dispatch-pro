import { OpportunityCard } from "./OpportunityCard";
import { DraggableOpportunityCard } from "./DraggableOpportunityCard";

interface SplitOpportunityGroupCardProps {
  master: any;
  splits: any[];
  combinedTotal?: number;
  currentStage: string;
  draggable?: boolean;
  forceExpanded?: boolean;
  onOrderMove: () => void;
  onOrderClick: (order: any) => void;
}

export function SplitOpportunityGroupCard({
  splits,
  currentStage,
  draggable = false,
  onOrderMove,
  onOrderClick,
}: SplitOpportunityGroupCardProps) {
  return (
    <div className="space-y-3">
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
  );
}
