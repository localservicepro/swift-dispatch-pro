import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ReturnItem {
  product_id: string;
  product_name: string;
  original_quantity: number;
  quantity_returned: number;
  unit_price: number;
}

interface ReturnSummaryProps {
  returnItems: ReturnItem[];
  returnReason: string;
  returnNotes: string;
}

export function ReturnSummary({ returnItems, returnReason, returnNotes }: ReturnSummaryProps) {
  const totalItems = returnItems.reduce((sum, item) => sum + item.quantity_returned, 0);
  const totalValue = returnItems.reduce((sum, item) => sum + (item.quantity_returned * item.unit_price), 0);

  if (returnItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Return Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-4">
            No items selected for return
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Return Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {returnItems.map((item) => (
            <div key={item.product_id} className="flex justify-between items-center">
              <div className="flex-1">
                <div className="font-medium">{item.product_name}</div>
                <div className="text-sm text-muted-foreground">
                  Returning {item.quantity_returned} of {item.original_quantity}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${(item.quantity_returned * item.unit_price).toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  ${item.unit_price.toFixed(2)} each
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Items Returning:</span>
            <span className="font-medium">{totalItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Value:</span>
            <span className="font-medium">${totalValue.toFixed(2)}</span>
          </div>
        </div>

        {returnReason && (
          <div className="pt-2">
            <div className="font-medium text-sm mb-1">Reason:</div>
            <div className="text-sm text-muted-foreground">{returnReason}</div>
          </div>
        )}

        {returnNotes && (
          <div className="pt-2">
            <div className="font-medium text-sm mb-1">Notes:</div>
            <div className="text-sm text-muted-foreground">{returnNotes}</div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            ℹ️ Stock Update Notice
          </div>
          <div className="text-sm text-blue-700 mt-1">
            These items will be automatically added back to inventory when the return is processed.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}