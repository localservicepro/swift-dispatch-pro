
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Calendar, Clock, Minus, Plus } from "lucide-react";
import { CartItem, SplitConfig } from "./types";

interface SplitSummaryCardProps {
  split: SplitConfig;
  splitIndex: number;
  cart: CartItem[];
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  onUpdateQuantity: (splitIndex: number, productId: string, quantity: number) => void;
  onRemoveProduct: (splitIndex: number, productId: string) => void;
}

export function SplitSummaryCard({ 
  split, 
  splitIndex, 
  cart, 
  onUpdateSplit, 
  onUpdateQuantity, 
  onRemoveProduct 
}: SplitSummaryCardProps) {
  const splitTotal = split.products.reduce((sum, splitProduct) => {
    const cartItem = cart.find(item => item.product.id === splitProduct.productId);
    return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
  }, 0);

  const totalItems = split.products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>{split.name}</span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
            <Badge variant="outline" className="text-xs">${splitTotal.toFixed(2)}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 py-3">
        {/* Products in this split */}
        {split.products.length > 0 && (
          <div>
            <Label className="text-xs font-medium mb-1 block">Products</Label>
            <div className="space-y-1">
              {split.products.map(splitProduct => {
                const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                if (!cartItem) return null;
                
                return (
                  <div key={splitProduct.productId} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                    <div className="flex-1">
                      <span className="font-medium">{cartItem.product.name}</span>
                      <div className="text-gray-500">
                        ${cartItem.unit_price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity - 1)}
                        disabled={splitProduct.quantity <= 1}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="w-2 h-2" />
                      </Button>
                      <span className="w-6 text-center text-xs">{splitProduct.quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity + 1)}
                        disabled={splitProduct.quantity >= cartItem.quantity}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-2 h-2" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveProduct(splitIndex, splitProduct.productId)}
                        className="text-red-600 hover:text-red-700 text-xs h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {split.products.length === 0 && (
          <div className="text-center py-2 text-gray-500 bg-gray-50 rounded text-xs">
            No products assigned to this split yet
          </div>
        )}

        {/* Basic delivery info */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
              <Calendar className="w-2 h-2" />
              Delivery Date
            </Label>
            <Input
              type="date"
              value={split.deliveryDate}
              onChange={(e) => onUpdateSplit(splitIndex, { deliveryDate: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
              <Clock className="w-2 h-2" />
              Delivery Time
            </Label>
            <Input
              type="time"
              value={split.deliveryTime}
              onChange={(e) => onUpdateSplit(splitIndex, { deliveryTime: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
