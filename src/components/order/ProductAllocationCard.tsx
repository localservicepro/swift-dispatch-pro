
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Plus } from "lucide-react";
import { CartItem, SplitConfig } from "./types";

interface ProductAllocationCardProps {
  cartItem: CartItem;
  splits: SplitConfig[];
  onAddToSplit: (splitIndex: number, productId: string) => void;
}

export function ProductAllocationCard({ cartItem, splits, onAddToSplit }: ProductAllocationCardProps) {
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

  const getProgressColor = () => {
    if (totalAllocated === 0) return "bg-red-500";
    if (remainingQuantity > 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {cartItem.product.name}
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {totalAllocated}/{cartItem.quantity}
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <Progress value={allocationPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Allocated: {totalAllocated}</span>
            <span>Remaining: {remainingQuantity}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {splits.map((split, index) => {
            const canAddToSplit = remainingQuantity > 0;
            return (
              <Button
                key={split.id}
                variant="outline"
                size="sm"
                onClick={() => canAddToSplit && onAddToSplit(index, cartItem.product.id)}
                disabled={!canAddToSplit}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add to {split.name}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
