import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface StockItem {
  product_id: string;
  product_name: string;
  requested_quantity: number;
  available_stock: number;
  is_sufficient: boolean;
}

interface StockAvailabilityWarningProps {
  stockAvailability: StockItem[];
  isBackOrder: boolean;
}

export function StockAvailabilityWarning({ stockAvailability, isBackOrder }: StockAvailabilityWarningProps) {
  if (!stockAvailability || stockAvailability.length === 0) {
    return null;
  }

  const outOfStockItems = stockAvailability.filter(item => !item.is_sufficient);
  const inStockItems = stockAvailability.filter(item => item.is_sufficient);

  if (outOfStockItems.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">All Items In Stock</AlertTitle>
        <AlertDescription className="text-green-700">
          All requested items are available and your order can be fulfilled immediately.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {isBackOrder && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Back Order Required</AlertTitle>
          <AlertDescription className="text-amber-700">
            Some items in your order are out of stock. This order has been marked as a back order and will be fulfilled when inventory becomes available.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <h4 className="font-medium text-foreground">Stock Availability Summary:</h4>
        
        {inStockItems.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Available Items ({inStockItems.length})
            </h5>
            <div className="grid gap-2">
              {inStockItems.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-green-900">{item.product_name}</p>
                    <p className="text-sm text-green-700">
                      Requested: {item.requested_quantity} | Available: {item.available_stock}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    In Stock
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {outOfStockItems.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Out of Stock Items ({outOfStockItems.length})
            </h5>
            <div className="grid gap-2">
              {outOfStockItems.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-900">{item.product_name}</p>
                    <p className="text-sm text-red-700">
                      Requested: {item.requested_quantity} | Available: {item.available_stock}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Short by: {item.requested_quantity - item.available_stock} units
                    </p>
                  </div>
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    Back Order
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}