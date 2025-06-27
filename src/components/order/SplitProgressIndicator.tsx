
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CartItem, SplitConfig } from "./types";

interface SplitProgressIndicatorProps {
  cart: CartItem[];
  splits: SplitConfig[];
}

export function SplitProgressIndicator({ cart, splits }: SplitProgressIndicatorProps) {
  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const getTotalAllocated = () => {
    return splits.reduce((total, split) => {
      return total + split.products.reduce((splitTotal, product) => {
        return splitTotal + product.quantity;
      }, 0);
    }, 0);
  };

  const getFullyAllocatedProducts = () => {
    return cart.filter(cartItem => {
      const allocatedQuantity = splits.reduce((total, split) => {
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity === cartItem.quantity;
    }).length;
  };

  const getConfiguredSplits = () => {
    return splits.filter(split => 
      split.deliveryDate && 
      split.deliveryTime && 
      split.products.length > 0
    ).length;
  };

  const totalItems = getTotalItems();
  const totalAllocated = getTotalAllocated();
  const fullyAllocatedProducts = getFullyAllocatedProducts();
  const configuredSplits = getConfiguredSplits();
  
  const allocationProgress = totalItems > 0 ? (totalAllocated / totalItems) * 100 : 0;
  const productProgress = cart.length > 0 ? (fullyAllocatedProducts / cart.length) * 100 : 0;
  const splitProgress = splits.length > 0 ? (configuredSplits / splits.length) * 100 : 0;

  const isAllocationComplete = allocationProgress === 100;
  const isConfigurationComplete = splitProgress === 100;
  const isReadyToProceed = isAllocationComplete && isConfigurationComplete;

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Split Configuration Progress</h3>
        {isReadyToProceed && (
          <Badge variant="default" className="bg-green-500 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready to proceed
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Product Allocation Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Product Allocation</span>
            <span className="text-xs font-medium">
              {fullyAllocatedProducts}/{cart.length} products complete
            </span>
          </div>
          <Progress value={productProgress} className="h-2" />
        </div>

        {/* Item Allocation Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Item Allocation</span>
            <span className="text-xs font-medium">
              {totalAllocated}/{totalItems} items allocated
            </span>
          </div>
          <Progress value={allocationProgress} className="h-2" />
        </div>

        {/* Split Configuration Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Split Configuration</span>
            <span className="text-xs font-medium">
              {configuredSplits}/{splits.length} splits configured
            </span>
          </div>
          <Progress value={splitProgress} className="h-2" />
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {!isAllocationComplete && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <Clock className="w-3 h-3" />
            <span>Allocate all products to splits to continue</span>
          </div>
        )}
        
        {isAllocationComplete && !isConfigurationComplete && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <AlertCircle className="w-3 h-3" />
            <span>Set delivery details for all splits</span>
          </div>
        )}
      </div>
    </div>
  );
}
