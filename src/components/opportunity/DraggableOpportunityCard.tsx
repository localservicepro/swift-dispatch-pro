
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { OpportunityCard } from './OpportunityCard';

interface DraggableOpportunityCardProps {
  order: any;
  currentStage: string;
  onOrderMove: () => void;
}

export function DraggableOpportunityCard({ order, currentStage, onOrderMove }: DraggableOpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: order.id,
    data: {
      order,
      currentStage,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute -left-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <div className="bg-white shadow-md rounded p-1 border">
          <GripVertical className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* Opportunity Card */}
      <div className={isDragging ? "pointer-events-none" : ""}>
        <OpportunityCard
          order={order}
          currentStage={currentStage}
          onOrderMove={onOrderMove}
        />
      </div>
    </div>
  );
}
