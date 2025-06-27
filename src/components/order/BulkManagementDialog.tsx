
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  Copy, 
  Shuffle, 
  MoveHorizontal,
  CheckSquare,
  Square,
  Package
} from "lucide-react";
import { CartItem, SplitConfig } from "./types";

interface BulkManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
}

export function BulkManagementDialog({
  isOpen,
  onClose,
  cart,
  splits,
  onSplitsChange
}: BulkManagementDialogProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sourceSplit, setSourceSplit] = useState<number | null>(null);
  const [targetSplit, setTargetSplit] = useState<number | null>(null);
  const [operation, setOperation] = useState<'move' | 'copy' | 'distribute'>('move');

  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const selectAllProducts = () => {
    const allProductIds = cart.map(item => item.product.id);
    setSelectedProducts(allProductIds);
  };

  const clearSelection = () => {
    setSelectedProducts([]);
  };

  const moveAllProductsToSplit = (targetIndex: number) => {
    const updatedSplits = splits.map((split, index) => ({
      ...split,
      products: index === targetIndex 
        ? cart.map(cartItem => ({
            productId: cartItem.product.id,
            quantity: cartItem.quantity
          }))
        : []
    }));
    onSplitsChange(updatedSplits);
  };

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

  const copyProductsBetweenSplits = () => {
    if (sourceSplit === null || targetSplit === null || sourceSplit === targetSplit) return;

    const updatedSplits = [...splits];
    const sourceProducts = updatedSplits[sourceSplit].products.filter(p => 
      selectedProducts.includes(p.productId)
    );

    sourceProducts.forEach(sourceProduct => {
      const existingProduct = updatedSplits[targetSplit].products.find(p => 
        p.productId === sourceProduct.productId
      );

      if (existingProduct) {
        // Add to existing quantity (but don't exceed cart limit)
        const cartItem = cart.find(item => item.product.id === sourceProduct.productId);
        const totalAllocated = splits.reduce((total, split, index) => {
          if (index === targetSplit) return total;
          const splitProduct = split.products.find(p => p.productId === sourceProduct.productId);
          return total + (splitProduct?.quantity || 0);
        }, 0);
        
        const maxAllowed = (cartItem?.quantity || 0) - totalAllocated;
        existingProduct.quantity = Math.min(
          existingProduct.quantity + sourceProduct.quantity,
          maxAllowed
        );
      } else {
        updatedSplits[targetSplit].products.push({ ...sourceProduct });
      }
    });

    onSplitsChange(updatedSplits);
  };

  const moveProductsBetweenSplits = () => {
    if (sourceSplit === null || targetSplit === null || sourceSplit === targetSplit) return;

    const updatedSplits = [...splits];
    
    // Remove products from source split
    const productsToMove = updatedSplits[sourceSplit].products.filter(p => 
      selectedProducts.includes(p.productId)
    );
    
    updatedSplits[sourceSplit].products = updatedSplits[sourceSplit].products.filter(p => 
      !selectedProducts.includes(p.productId)
    );

    // Add products to target split
    productsToMove.forEach(product => {
      const existingProduct = updatedSplits[targetSplit].products.find(p => 
        p.productId === product.productId
      );

      if (existingProduct) {
        existingProduct.quantity += product.quantity;
      } else {
        updatedSplits[targetSplit].products.push({ ...product });
      }
    });

    onSplitsChange(updatedSplits);
  };

  const executeOperation = () => {
    if (operation === 'move') {
      moveProductsBetweenSplits();
    } else if (operation === 'copy') {
      copyProductsBetweenSplits();
    } else if (operation === 'distribute') {
      distributeEvenly();
    }
    
    setSelectedProducts([]);
    setSourceSplit(null);
    setTargetSplit(null);
    onClose();
  };

  const getProductAllocation = (productId: string) => {
    return splits.map((split, index) => {
      const splitProduct = split.products.find(p => p.productId === productId);
      return {
        splitIndex: index,
        splitName: split.name,
        quantity: splitProduct?.quantity || 0
      };
    }).filter(allocation => allocation.quantity > 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveHorizontal className="w-5 h-5" />
            Bulk Product Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Quick Actions */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Quick Actions</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={distributeEvenly}
                className="text-xs"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Distribute Evenly
              </Button>
              
              {splits.map((split, index) => (
                <Button
                  key={split.id}
                  variant="outline"
                  size="sm"
                  onClick={() => moveAllProductsToSplit(index)}
                  className="text-xs"
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  All to {split.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Operation Selection */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Operation</Label>
              <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move">Move Products</SelectItem>
                  <SelectItem value="copy">Copy Products</SelectItem>
                  <SelectItem value="distribute">Distribute Evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {operation !== 'distribute' && (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">From Split</Label>
                  <Select value={sourceSplit?.toString() || ""} onValueChange={(value) => setSourceSplit(parseInt(value))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {splits.map((split, index) => (
                        <SelectItem key={split.id} value={index.toString()}>
                          {split.name} ({split.products.length} products)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">To Split</Label>
                  <Select value={targetSplit?.toString() || ""} onValueChange={(value) => setTargetSplit(parseInt(value))}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {splits.map((split, index) => (
                        <SelectItem key={split.id} value={index.toString()} disabled={index === sourceSplit}>
                          {split.name} ({split.products.length} products)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Product Selection */}
          {operation !== 'distribute' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Select Products</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllProducts}
                    className="text-xs"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto space-y-2">
                {cart.map(cartItem => {
                  const allocations = getProductAllocation(cartItem.product.id);
                  const isSelected = selectedProducts.includes(cartItem.product.id);
                  
                  return (
                    <div
                      key={cartItem.product.id}
                      className={`p-3 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleProductSelect(cartItem.product.id, checked)}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="w-4 h-4" />
                              <span className="font-medium text-sm">{cartItem.product.name}</span>
                            </div>
                            <p className="text-xs text-gray-600">
                              Total Quantity: {cartItem.quantity} | ${cartItem.unit_price.toFixed(2)} each
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {allocations.map(allocation => (
                                <Badge key={allocation.splitIndex} variant="secondary" className="text-xs">
                                  {allocation.splitName}: {allocation.quantity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={executeOperation}
            disabled={
              operation !== 'distribute' && 
              (selectedProducts.length === 0 || sourceSplit === null || targetSplit === null)
            }
            className="flex-1"
          >
            {operation === 'move' && 'Move Selected Products'}
            {operation === 'copy' && 'Copy Selected Products'}
            {operation === 'distribute' && 'Distribute All Products'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
