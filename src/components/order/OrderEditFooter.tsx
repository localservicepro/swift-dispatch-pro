
import { Button } from "@/components/ui/button";

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
}

export function OrderEditFooter({ 
  isUpdating, 
  onClose, 
  driverConflict, 
  truckConflict, 
  hasAnyConflict 
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
    <div className="flex gap-2 justify-end">
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
  );
}
