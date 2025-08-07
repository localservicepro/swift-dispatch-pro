
import { Button } from "@/components/ui/button";
import { CheckCircle, Camera, Calendar } from "lucide-react";
import { formatDeliveredDate } from "@/utils/dateTimeUtils";

interface OpportunityCardCompletedProps {
  hasDeliveryPhotos: boolean;
  onViewProof: (e: React.MouseEvent) => void;
  deliveredAt?: string;
}

export function OpportunityCardCompleted({ hasDeliveryPhotos, onViewProof, deliveredAt }: OpportunityCardCompletedProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 text-green-600 text-xs font-medium">
        <CheckCircle className="w-3 h-3" />
        Completed
      </div>
      {deliveredAt && (
        <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
          <Calendar className="w-3 h-3" />
          {formatDeliveredDate(deliveredAt)}
        </div>
      )}
      {/* View Proof Button for completed orders */}
      {hasDeliveryPhotos && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewProof}
          className="w-full flex items-center gap-2 text-xs text-green-600 border-green-300 hover:bg-green-50"
        >
          <Camera className="w-3 h-3" />
          View Proof of Delivery
        </Button>
      )}
    </div>
  );
}
