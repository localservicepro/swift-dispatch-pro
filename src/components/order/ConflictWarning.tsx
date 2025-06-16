
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar, Info } from "lucide-react";
import { ConflictResult } from "@/utils/conflictDetection";

interface ConflictWarningProps {
  driverConflict?: ConflictResult;
  truckConflict?: ConflictResult;
}

export function ConflictWarning({ driverConflict, truckConflict }: ConflictWarningProps) {
  const hasBlockingConflict = (driverConflict?.hasConflict || truckConflict?.hasConflict);
  const hasAnyInfo = (driverConflict?.conflictingOrders.length || truckConflict?.conflictingOrders.length);

  if (!hasAnyInfo) return null;

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
      case 'same-day': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityLabel = (conflictType: string) => {
    switch (conflictType) {
      case 'exact': return 'CRITICAL';
      case 'overlap': return 'WARNING';
      case 'same-day': return 'INFO';
      default: return '';
    }
  };

  return (
    <div className="space-y-2">
      {driverConflict?.conflictingOrders.length > 0 && (
        <Alert variant={getVariant(driverConflict.conflictType)}>
          <div className="flex items-start gap-2">
            {getIcon(driverConflict.conflictType)}
            <div className="flex-1">
              <AlertDescription>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Driver Conflict</span>
                  {getSeverityLabel(driverConflict.conflictType) && (
                    <Badge variant="outline" className="text-xs">
                      {getSeverityLabel(driverConflict.conflictType)}
                    </Badge>
                  )}
                </div>
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

      {truckConflict?.conflictingOrders.length > 0 && (
        <Alert variant={getVariant(truckConflict.conflictType)}>
          <div className="flex items-start gap-2">
            {getIcon(truckConflict.conflictType)}
            <div className="flex-1">
              <AlertDescription>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Truck Conflict</span>
                  {getSeverityLabel(truckConflict.conflictType) && (
                    <Badge variant="outline" className="text-xs">
                      {getSeverityLabel(truckConflict.conflictType)}
                    </Badge>
                  )}
                </div>
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
