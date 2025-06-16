
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
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {split.name}
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{totalItems} items</Badge>
            <Badge variant="outline">${splitTotal.toFixed(2)}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products in this split */}
        {split.products.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Products</Label>
            <div className="space-y-2">
              {split.products.map(splitProduct => {
                const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                if (!cartItem) return null;
                
                return (
                  <div key={splitProduct.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div>
                      <span className="text-sm font-medium">{cartItem.product.name}</span>
                      <div className="text-xs text-gray-500">
                        ${cartItem.unit_price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity - 1)}
                        disabled={splitProduct.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{splitProduct.quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity + 1)}
                        disabled={splitProduct.quantity >= cartItem.quantity}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveProduct(splitIndex, splitProduct.productId)}
                        className="text-red-600 hover:text-red-700"
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
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
            No products assigned to this split yet
          </div>
        )}

        {/* Basic delivery info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Delivery Date
            </Label>
            <Input
              type="date"
              value={split.deliveryDate}
              onChange={(e) => onUpdateSplit(splitIndex, { deliveryDate: e.target.value })}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Delivery Time
            </Label>
            <Input
              type="time"
              value={split.deliveryTime}
              onChange={(e) => onUpdateSplit(splitIndex, { deliveryTime: e.target.value })}
              className="h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
