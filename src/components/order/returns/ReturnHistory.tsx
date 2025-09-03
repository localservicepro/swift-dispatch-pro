import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { CheckCircle, Clock, Package, User, Calendar } from "lucide-react";
import { formatDistance } from "date-fns";

interface ReturnHistoryProps {
  orderId: string;
}

export function ReturnHistory({ orderId }: ReturnHistoryProps) {
  const { returns, isLoading, processReturn } = useOrderReturns(orderId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading return history...</div>
        </CardContent>
      </Card>
    );
  }

  if (returns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            No returns recorded for this order
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-orange-100 text-orange-800',
          label: 'Pending Processing'
        };
      case 'processed':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800',
          label: 'Processed'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800',
          label: 'Completed'
        };
      default:
        return {
          icon: Package,
          color: 'bg-gray-100 text-gray-800',
          label: status
        };
    }
  };

  const handleProcessReturn = async (returnId: string) => {
    await processReturn(returnId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Return History ({returns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {returns.map((returnRecord, index) => {
          const statusInfo = getStatusInfo(returnRecord.status);
          const StatusIcon = statusInfo.icon;
          
          return (
            <div key={returnRecord.id}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistance(new Date(returnRecord.created_at), new Date(), { addSuffix: true })}
                  </div>
                </div>
                
                {returnRecord.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleProcessReturn(returnRecord.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    variant="outline"
                  >
                    Process Return
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-sm font-medium mb-2">Returned Items ({returnRecord.total_items_returned})</div>
                  <div className="space-y-1">
                    {returnRecord.returned_items.map((item: any, idx: number) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>{item.product_name}</span>
                        <span className="text-muted-foreground">Qty: {item.quantity_returned}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Return Details</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {returnRecord.return_reason && (
                      <div>Reason: {returnRecord.return_reason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    )}
                    {returnRecord.return_notes && (
                      <div>Notes: {returnRecord.return_notes}</div>
                    )}
                    {returnRecord.processed_at && (
                      <div>Processed: {formatDistance(new Date(returnRecord.processed_at), new Date(), { addSuffix: true })}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-900">
                  📦 Stock Impact: {returnRecord.status === 'processed' ? 'Items have been added back to inventory' : 'Items will be added back when processed'}
                </div>
              </div>

              {index < returns.length - 1 && <Separator className="my-4" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}