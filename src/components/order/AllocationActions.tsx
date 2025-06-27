import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shuffle, RotateCcw, CheckCircle, Settings } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { BulkManagementDialog } from "./BulkManagementDialog";

interface AllocationActionsProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
}

export function AllocationActions({ cart, splits, onSplitsChange }: AllocationActionsProps) {
  const [bulkManagementOpen, setBulkManagementOpen] = useState(false);

  const distributeEvenly = () => {
    const updatedSplits = splits.map(split => ({ ...split, products: [] }));
    
    cart.forEach(cartItem => {
      const quantityPerSplit = Math.floor(cartItem.quantity / splits.length);
      const remainder = cartItem.quantity % splits.length;
      
      splits.forEach((_, index) => {
        const quantity = quantityPerSplit + (index < remainder ? 1 : 0);
        if (quantity > 0) {
          updatedSplits[index].products.push({
            productId: cartItem.product.id,
            quantity: quantity
          });
        }
      });
    });
    
    onSplitsChange(updatedSplits);
  };

  const moveAllToSplit = (targetSplitIndex: number) => {
    const updatedSplits = splits.map((split, index) => ({
      ...split,
      products: index === targetSplitIndex 
        ? cart.map(cartItem => ({
            productId: cartItem.product.id,
            quantity: cartItem.quantity
          }))
        : []
    }));
    
    onSplitsChange(updatedSplits);
  };

  const clearAllocation = () => {
    const updatedSplits = splits.map(split => ({ ...split, products: [] }));
    onSplitsChange(updatedSplits);
  };

  const isFullyAllocated = cart.every(cartItem => {
    const totalAllocated = splits.reduce((total, split) => {
      const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
      return total + (splitProduct?.quantity || 0);
    }, 0);
    return totalAllocated === cartItem.quantity;
  });

  return (
    <>
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-700">Quick Actions</h3>
          {isFullyAllocated && (
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <CheckCircle className="w-3 h-3" />
              All products allocated
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={distributeEvenly}
            className="text-xs h-7"
          >
            <Shuffle className="w-2 h-2 mr-1" />
            Distribute Evenly
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Move all to:</span>
            <Select onValueChange={(value) => moveAllToSplit(parseInt(value))}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Select split" />
              </SelectTrigger>
              <SelectContent>
                {splits.map((split, index) => (
                  <SelectItem key={split.id} value={index.toString()} className="text-xs">
                    {split.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllocation}
            className="text-xs text-red-600 hover:text-red-700 h-7"
          >
            <RotateCcw className="w-2 h-2 mr-1" />
            Clear All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkManagementOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 h-7"
          >
            <Settings className="w-2 h-2 mr-1" />
            Bulk Management
          </Button>
        </div>
      </div>

      <BulkManagementDialog
        isOpen={bulkManagementOpen}
        onClose={() => setBulkManagementOpen(false)}
        cart={cart}
        splits={splits}
        onSplitsChange={onSplitsChange}
      />
    </>
  );
}
