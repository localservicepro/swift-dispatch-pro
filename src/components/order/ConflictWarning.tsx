
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar } from "lucide-react";
import { ConflictResult } from "@/utils/conflictDetection";

interface ConflictWarningProps {
  driverConflict?: ConflictResult;
  truckConflict?: ConflictResult;
}

export function ConflictWarning({ driverConflict, truckConflict }: ConflictWarningProps) {
  const hasAnyConflict = (driverConflict?.hasConflict || truckConflict?.hasConflict);

  if (!hasAnyConflict) return null;

  const getVariant = (conflictType: string) => {
    switch (conflictType) {
      case 'exact': return 'destructive';
      case 'overlap': return 'destructive';
      case 'same-day': return 'default';
      default: return 'default';
    }
  };

  const getIcon = (conflictType: string) => {
    switch (conflictType) {
      case 'exact': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'overlap': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'same-day': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-2">
      {driverConflict?.hasConflict && (
        <Alert variant={getVariant(driverConflict.conflictType)}>
          <div className="flex items-start gap-2">
            {getIcon(driverConflict.conflictType)}
            <div className="flex-1">
              <AlertDescription>
                <div className="font-medium mb-1">Driver Conflict</div>
                <div className="text-sm">{driverConflict.message}</div>
                <div className="mt-2 space-y-1">
                  {driverConflict.conflictingOrders.map((order) => (
                    <div key={order.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {order.order_number}
                      </Badge>
                      <span>{order.customer_name}</span>
                      {order.delivery_time && (
                        <span className="text-muted-foreground">
                          at {order.delivery_time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {truckConflict?.hasConflict && (
        <Alert variant={getVariant(truckConflict.conflictType)}>
          <div className="flex items-start gap-2">
            {getIcon(truckConflict.conflictType)}
            <div className="flex-1">
              <AlertDescription>
                <div className="font-medium mb-1">Truck Conflict</div>
                <div className="text-sm">{truckConflict.message}</div>
                <div className="mt-2 space-y-1">
                  {truckConflict.conflictingOrders.map((order) => (
                    <div key={order.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {order.order_number}
                      </Badge>
                      <span>{order.customer_name}</span>
                      {order.delivery_time && (
                        <span className="text-muted-foreground">
                          at {order.delivery_time}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
