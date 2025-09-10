import { AlertTriangle, DollarSign, Package } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface OrderEditStatusWarningProps {
  currentStatus: string;
  hasProductChanges: boolean;
  hasTotalChanges: boolean;
  oldTotal?: number;
  newTotal?: number;
  paymentStatus?: string;
}

export function OrderEditStatusWarning({
  currentStatus,
  hasProductChanges,
  hasTotalChanges,
  oldTotal,
  newTotal,
  paymentStatus
}: OrderEditStatusWarningProps) {
  const isCompletedOrder = ['delivered', 'completed'].includes(currentStatus);
  const isPaidOrder = paymentStatus === 'paid';
  
  if (!isCompletedOrder && !hasTotalChanges && !hasProductChanges) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 font-medium">
        Editing {isCompletedOrder ? 'Completed' : 'Active'} Order
      </AlertTitle>
      <AlertDescription className="text-amber-700 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span>Current Status:</span>
          <Badge className={getStatusColor(currentStatus)}>
            {currentStatus.toUpperCase()}
          </Badge>
          {isPaidOrder && (
            <Badge className={getStatusColor('paid')}>
              PAID
            </Badge>
          )}
        </div>
        
        {isCompletedOrder && (
          <div className="flex items-center gap-1 text-sm">
            <Package className="w-4 h-4" />
            <span>This order has already been completed. Changes will affect historical records.</span>
          </div>
        )}
        
        {hasTotalChanges && (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="w-4 h-4" />
            <span>
              Total changing from ${oldTotal?.toFixed(2)} to ${newTotal?.toFixed(2)}.
              {isPaidOrder && (
                <span className="font-medium ml-1">
                  Payment status will be adjusted.
                </span>
              )}
            </span>
          </div>
        )}
        
        {hasProductChanges && (
          <div className="flex items-center gap-1 text-sm">
            <Package className="w-4 h-4" />
            <span>Product quantities/items are being modified. Inventory may be affected.</span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}