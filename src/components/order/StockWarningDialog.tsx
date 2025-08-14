import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Package } from "lucide-react";
import { StockIndicator } from "@/components/ui/stock-indicator";

interface StockWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  stockQuantity: number;
  requestedQuantity: number;
}

export function StockWarningDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
  stockQuantity,
  requestedQuantity
}: StockWarningDialogProps) {
  const isBackorder = stockQuantity <= 0;
  const isLowStock = stockQuantity > 0 && stockQuantity < requestedQuantity;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {isBackorder ? "Backorder Required" : "Low Stock Warning"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <Package className="w-4 h-4 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{productName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StockIndicator stockQuantity={stockQuantity} />
                    <span className="text-xs text-gray-600">
                      Requested: {requestedQuantity}
                    </span>
                  </div>
                </div>
              </div>
              
              {isBackorder ? (
                <p>
                  This product is currently out of stock or on backorder. 
                  Adding it to the order will create a backorder that can be fulfilled when stock becomes available.
                </p>
              ) : (
                <p>
                  You're requesting more quantity than currently available in stock. 
                  The remaining {requestedQuantity - stockQuantity} units will be placed on backorder.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isBackorder ? "Create Backorder" : "Continue with Backorder"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}