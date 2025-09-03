import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { RotateCcw, Package, CheckCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/components/order/utils/paymentCalculations";

interface OrderReturnsSectionProps {
  orderId: string;
  onProcessReturn?: (returnId: string) => void;
}

export function OrderReturnsSection({ orderId, onProcessReturn }: OrderReturnsSectionProps) {
  const { returns, isLoading, processReturn } = useOrderReturns(orderId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading returns...</div>;
  }

  if (returns.length === 0) {
    return null;
  }

  const handleProcessReturn = async (returnId: string) => {
    const success = await processReturn(returnId);
    if (success && onProcessReturn) {
      onProcessReturn(returnId);
    }
  };

  // Calculate total return value
  const totalReturnValue = returns.reduce((sum, returnRecord) => {
    const returnValue = returnRecord.returned_items.reduce((itemSum: number, item: any) => {
      return itemSum + (item.unit_price * item.quantity_returned);
    }, 0);
    return sum + returnValue;
  }, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Package className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'processed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Processed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Returned Items
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          Total: {formatCurrency(totalReturnValue)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {returns.map((returnRecord) => {
          const returnValue = returnRecord.returned_items.reduce((sum: number, item: any) => {
            return sum + (item.unit_price * item.quantity_returned);
          }, 0);

          return (
            <div key={returnRecord.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(returnRecord.status)}
                  <span className="font-medium">Return #{returnRecord.id.slice(0, 8)}</span>
                  {getStatusBadge(returnRecord.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(returnValue)}</span>
                  {returnRecord.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessReturn(returnRecord.id)}
                      className="text-xs"
                    >
                      Process Return
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {returnRecord.returned_items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                    <div>
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-muted-foreground ml-2">
                        Qty: {item.quantity_returned} × {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(item.unit_price * item.quantity_returned)}
                    </span>
                  </div>
                ))}
              </div>

              {returnRecord.return_reason && (
                <div className="text-sm">
                  <span className="font-medium">Reason:</span>
                  <span className="ml-2 text-muted-foreground">{returnRecord.return_reason}</span>
                </div>
              )}

              {returnRecord.return_notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span>
                  <span className="ml-2 text-muted-foreground">{returnRecord.return_notes}</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Returned on {new Date(returnRecord.return_date).toLocaleDateString()}
                {returnRecord.processed_at && (
                  <span className="ml-2">
                    • Processed on {new Date(returnRecord.processed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}