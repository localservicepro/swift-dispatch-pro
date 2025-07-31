import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StockItem {
  product_id: string;
  product_name: string;
  requested_quantity: number;
  available_stock: number;
  is_sufficient: boolean;
}

interface StockSplitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSplitComplete: () => void;
}

export function StockSplitDialog({ isOpen, onClose, order, onSplitComplete }: StockSplitDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [hasCheckedStock, setHasCheckedStock] = useState(false);

  const checkStockAvailability = async () => {
    try {
      const { data, error } = await supabase.rpc('check_stock_availability', {
        order_items: order.products
      });

      if (error) throw error;
      setStockItems(data || []);
      setHasCheckedStock(true);
    } catch (error: any) {
      console.error('Error checking stock:', error);
      toast({
        title: "Error",
        description: "Failed to check stock availability",
        variant: "destructive"
      });
    }
  };

  const handleSplitByStock = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_stock_split_order', {
        p_order_id: order.id
      });

      if (error) throw error;

      toast({
        title: "Order Split Successfully",
        description: `Order has been split into ${data.length} orders based on stock availability`,
      });

      onSplitComplete();
      onClose();
    } catch (error: any) {
      console.error('Error splitting order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to split order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepTogether = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'back_order' })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Order Status Updated",
        description: "Order moved to back order status",
      });

      onSplitComplete();
      onClose();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    if (open && !hasCheckedStock) {
      checkStockAvailability();
    }
    if (!open) {
      onClose();
      setHasCheckedStock(false);
      setStockItems([]);
    }
  };

  const inStockItems = stockItems.filter(item => item.is_sufficient);
  const outOfStockItems = stockItems.filter(item => !item.is_sufficient);
  const hasMixedStock = inStockItems.length > 0 && outOfStockItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Mixed Stock Order - Choose Action
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Order <strong>{order.order_number}</strong> contains items with different stock availability.
            Choose how to handle this order:
          </div>

          {hasCheckedStock && (
            <div className="space-y-4">
              {/* In Stock Items */}
              {inStockItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-green-800">Available Items ({inStockItems.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {inStockItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{item.product_name}</span>
                        <div className="flex items-center gap-2">
                          <span>Qty: {item.requested_quantity}</span>
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            {item.available_stock} in stock
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Out of Stock Items */}
              {outOfStockItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-red-800">Out of Stock Items ({outOfStockItems.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {outOfStockItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{item.product_name}</span>
                        <div className="flex items-center gap-2">
                          <span>Need: {item.requested_quantity}</span>
                          <Badge variant="outline" className="text-red-700 border-red-300">
                            Only {item.available_stock} available
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasMixedStock && (
                <div className="text-center text-muted-foreground p-4">
                  This order doesn't have mixed stock availability.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-3">
          {hasMixedStock && (
            <>
              <div className="space-y-3 w-full">
                <Button
                  onClick={handleSplitByStock}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Split by Stock Availability
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  Available items → Preparing stage | Out of stock items → Back Order
                </div>
              </div>

              <div className="w-full border-t pt-3">
                <Button
                  onClick={handleKeepTogether}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  Keep Together (Move to Back Order)
                </Button>
              </div>
            </>
          )}

          <Button onClick={onClose} variant="ghost" className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}