
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

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3" />
            <span className="text-sm">{cartItem.product.name}</span>
          </div>
          <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
            {totalAllocated}/{cartItem.quantity}
          </Badge>
        </CardTitle>
        <div className="space-y-1">
          <Progress value={allocationPercentage} className="h-1.5" />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Allocated: {totalAllocated}</span>
            <span>Remaining: {remainingQuantity}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
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
                className="text-xs h-7 px-2"
              >
                <Plus className="w-2 h-2 mr-1" />
                {split.name}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
