
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Package, Plus, Minus, Trash2, Edit3 } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { useToast } from "@/hooks/use-toast";

interface ProductAllocationCardProps {
  cartItem: CartItem;
  splits: SplitConfig[];
  onAddToSplit: (splitIndex: number, productId: string) => void;
  onQuantityChange?: (productId: string, newQuantity: number) => void;
  onRemoveFromCart?: (productId: string) => void;
  onUpdateSplitQuantity?: (splitIndex: number, productId: string, quantity: number) => void;
}

export function ProductAllocationCard({ 
  cartItem, 
  splits, 
  onAddToSplit,
  onQuantityChange,
  onRemoveFromCart,
  onUpdateSplitQuantity
}: ProductAllocationCardProps) {
  const { toast } = useToast();
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(cartItem.quantity.toString());

  const totalAllocated = splits.reduce((total, split) => {
    const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
    return total + (splitProduct?.quantity || 0);
  }, 0);

  const remainingQuantity = cartItem.quantity - totalAllocated;
  const allocationPercentage = (totalAllocated / cartItem.quantity) * 100;

  const getStatusColor = () => {
    if (totalAllocated === 0) return "text-red-600";
    if (remainingQuantity > 0) return "text-yellow-600";
    return "text-green-600";
  };

  const handleQuantityDecrease = () => {
    if (cartItem.quantity > 1) {
      const newQuantity = cartItem.quantity - 1;
      if (newQuantity >= totalAllocated) {
        onQuantityChange?.(cartItem.product.id, newQuantity);
      } else {
        toast({
          title: "Cannot reduce quantity",
          description: "Cannot reduce below allocated quantity. Adjust split allocations first.",
          variant: "destructive",
        });
      }
    }
  };

  const handleQuantityIncrease = () => {
    const newQuantity = cartItem.quantity + 1;
    onQuantityChange?.(cartItem.product.id, newQuantity);
  };

  const handleQuantityEdit = () => {
    setIsEditingQuantity(true);
    setTempQuantity(cartItem.quantity.toString());
  };

  const handleQuantitySubmit = () => {
    const newQuantity = parseInt(tempQuantity);
    if (isNaN(newQuantity) || newQuantity < 1) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity (minimum 1)",
        variant: "destructive",
      });
      setTempQuantity(cartItem.quantity.toString());
      return;
    }

    if (newQuantity < totalAllocated) {
      toast({
        title: "Cannot reduce quantity",
        description: "Cannot reduce below allocated quantity. Adjust split allocations first.",
        variant: "destructive",
      });
      setTempQuantity(cartItem.quantity.toString());
      return;
    }

    onQuantityChange?.(cartItem.product.id, newQuantity);
    setIsEditingQuantity(false);
  };

  const handleQuantityCancel = () => {
    setTempQuantity(cartItem.quantity.toString());
    setIsEditingQuantity(false);
  };

  const handleDeleteProduct = () => {
    onRemoveFromCart?.(cartItem.product.id);
    toast({
      title: "Product removed",
      description: `${cartItem.product.name} has been removed from your cart`,
    });
  };

  const handleSplitQuantityAdjust = (splitIndex: number, change: number) => {
    const split = splits[splitIndex];
    const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
    const currentQuantity = splitProduct?.quantity || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    // Check if we can allocate more
    if (change > 0 && remainingQuantity <= 0) {
      toast({
        title: "Cannot allocate more",
        description: "No remaining quantity to allocate",
        variant: "destructive",
      });
      return;
    }

    onUpdateSplitQuantity?.(splitIndex, cartItem.product.id, newQuantity);
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3" />
            <span className="text-sm">{cartItem.product.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
              {totalAllocated}/{cartItem.quantity}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteProduct}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardTitle>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-600">Quantity:</span>
          {isEditingQuantity ? (
            <div className="flex items-center gap-1">
              <Input
                value={tempQuantity}
                onChange={(e) => setTempQuantity(e.target.value)}
                className="h-6 w-16 text-xs text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuantitySubmit();
                  if (e.key === 'Escape') handleQuantityCancel();
                }}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuantitySubmit}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              >
                ✓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuantityCancel}
                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuantityDecrease}
                disabled={cartItem.quantity <= 1 || cartItem.quantity <= totalAllocated}
                className="h-6 w-6 p-0"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="text-sm font-medium w-8 text-center">{cartItem.quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuantityIncrease}
                className="h-6 w-6 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuantityEdit}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Progress value={allocationPercentage} className="h-1.5" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Allocated: {totalAllocated}</span>
            <span>Remaining: {remainingQuantity}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        {/* Split Allocation Controls */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700">Split Allocations:</div>
          <div className="grid gap-2">
            {splits.map((split, index) => {
              const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
              const splitQuantity = splitProduct?.quantity || 0;
              
              return (
                <div key={split.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-700">{split.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSplitQuantityAdjust(index, -1)}
                      disabled={splitQuantity <= 0}
                      className="h-5 w-5 p-0"
                    >
                      <Minus className="w-2 h-2" />
                    </Button>
                    <span className="text-xs font-medium w-6 text-center">{splitQuantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSplitQuantityAdjust(index, 1)}
                      disabled={remainingQuantity <= 0}
                      className="h-5 w-5 p-0"
                    >
                      <Plus className="w-2 h-2" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Add to Split Buttons */}
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Quick Add to Split:</div>
          <div className="flex flex-wrap gap-1">
            {splits.map((split, index) => {
              const canAddToSplit = remainingQuantity > 0;
              return (
                <Button
                  key={split.id}
                  variant="outline"
                  size="sm"
                  onClick={() => canAddToSplit && onAddToSplit(index, cartItem.product.id)}
                  disabled={!canAddToSplit}
                  className="text-xs h-6 px-2"
                >
                  <Plus className="w-2 h-2 mr-1" />
                  {split.name}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
