import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryManagement } from "@/hooks/useInventoryManagement";
import { CartItem } from "./types";
import { serializeCartItemsWithFormatting } from "./services/orderFormattingService";
import { CheckCircle, AlertTriangle, XCircle, Package } from "lucide-react";

interface PreOrderStockCheckProps {
  cart: CartItem[];
  isVisible: boolean;
}

export function PreOrderStockCheck({ cart, isVisible }: PreOrderStockCheckProps) {
  const { checkStockAvailability, determineOrderStatus } = useInventoryManagement();
  const [stockCheck, setStockCheck] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>('requested');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && cart.length > 0) {
      performStockCheck();
    }
  }, [isVisible, cart]);

  const performStockCheck = async () => {
    try {
      setLoading(true);
      
      // Serialize cart items for stock check
      const serializedProducts = serializeCartItemsWithFormatting(cart);
      
      // Check stock availability
      const availability = await checkStockAvailability(serializedProducts);
      setStockCheck(availability);
      
      // Determine order status
      const status = await determineOrderStatus(serializedProducts);
      setOrderStatus(status);
    } catch (error) {
      console.error('Error performing stock check:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible || cart.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Availability Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cart.map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const outOfStockItems = stockCheck.filter(item => !item.is_sufficient);
  const inStockItems = stockCheck.filter(item => item.is_sufficient);
  const isBackOrder = orderStatus === 'back_order';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stock Availability Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {isBackOrder ? (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <strong>Back Order Required:</strong> Some items are out of stock. This order will be marked as a back order and fulfilled when inventory becomes available.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>All Items Available:</strong> Your order can be fulfilled immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Items List */}
        <div className="space-y-3">
          {stockCheck.map((item) => (
            <div key={item.product_id} className={`flex items-center justify-between p-3 rounded-lg border ${
              item.is_sufficient ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.is_sufficient ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <h4 className={`font-medium ${
                    item.is_sufficient ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {item.product_name}
                  </h4>
                </div>
                <p className={`text-sm mt-1 ${
                  item.is_sufficient ? 'text-green-700' : 'text-red-700'
                }`}>
                  Requested: {item.requested_quantity} | Available: {item.available_stock}
                  {!item.is_sufficient && (
                    <span className="ml-2 font-medium">
                      (Short by: {item.requested_quantity - item.available_stock})
                    </span>
                  )}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={item.is_sufficient 
                  ? "text-green-700 border-green-300" 
                  : "text-red-700 border-red-300"
                }
              >
                {item.is_sufficient ? 'In Stock' : 'Back Order'}
              </Badge>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-sm text-muted-foreground">
            {inStockItems.length} of {stockCheck.length} items available
          </div>
          <Badge variant={isBackOrder ? "destructive" : "default"}>
            Order Status: {isBackOrder ? 'Back Order' : 'Available'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}