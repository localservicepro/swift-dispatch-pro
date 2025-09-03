
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface ConflictInfo {
  hasConflict: boolean;
  conflictType?: 'exact' | 'overlap' | 'adjacent';
}

interface OrderEditFooterProps {
  isUpdating: boolean;
  onClose: () => void;
  driverConflict?: ConflictInfo;
  truckConflict?: ConflictInfo;
  hasAnyConflict: boolean;
  order?: {
    status: string;
  };
  onReturnClick?: () => void;
}

export function OrderEditFooter({ 
  isUpdating, 
  onClose, 
  driverConflict, 
  truckConflict, 
  hasAnyConflict,
  order,
  onReturnClick
}: OrderEditFooterProps) {
  const getButtonText = () => {
    if (isUpdating) return "Updating...";
    
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "Update Despite Conflicts";
      }
    }
    return "Update Order";
  };

  const getButtonStyle = () => {
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "bg-orange-600 hover:bg-orange-700";
      }
    }
    return "";
  };

  return (
    <div className="flex gap-2 justify-between">
      <div>
        {/* Return Button for delivered orders */}
        {order?.status === 'delivered' && onReturnClick && (
          <Button 
            type="button" 
            variant="outline"
            onClick={onReturnClick}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Return Items
          </Button>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isUpdating}
          className={getButtonStyle()}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}
