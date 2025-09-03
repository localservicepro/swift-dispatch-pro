import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  original_quantity: number;
  quantity_returned: number;
  unit_price: number;
}

interface ReturnItemSelectorProps {
  products: Product[];
  returnItems: ReturnItem[];
  onReturnItemsChange: (items: ReturnItem[]) => void;
}

export function ReturnItemSelector({
  products,
  returnItems,
  onReturnItemsChange
}: ReturnItemSelectorProps) {
  const updateReturnQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingReturnIndex = returnItems.findIndex(item => item.product_id === productId);
    
    if (quantity <= 0) {
      // Remove item from returns
      if (existingReturnIndex >= 0) {
        const newItems = [...returnItems];
        newItems.splice(existingReturnIndex, 1);
        onReturnItemsChange(newItems);
      }
    } else {
      // Add or update return item
      const returnItem: ReturnItem = {
        product_id: productId,
        product_name: product.name,
        original_quantity: product.quantity,
        quantity_returned: Math.min(quantity, product.quantity),
        unit_price: product.price
      };

      if (existingReturnIndex >= 0) {
        const newItems = [...returnItems];
        newItems[existingReturnIndex] = returnItem;
        onReturnItemsChange(newItems);
      } else {
        onReturnItemsChange([...returnItems, returnItem]);
      }
    }
  };

  const getReturnQuantity = (productId: string) => {
    const returnItem = returnItems.find(item => item.product_id === productId);
    return returnItem?.quantity_returned || 0;
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Select items and quantities to return:
      </div>
      
      {products.map((product) => {
        const returnQuantity = getReturnQuantity(product.id);
        const maxQuantity = product.quantity;

        return (
          <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-muted-foreground">
                Original quantity: {product.quantity} | Price: ${product.price.toFixed(2)}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm">Return:</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateReturnQuantity(product.id, returnQuantity - 1)}
                  disabled={returnQuantity <= 0}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <Input
                  type="number"
                  value={returnQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    updateReturnQuantity(product.id, value);
                  }}
                  min={0}
                  max={maxQuantity}
                  className="w-16 text-center h-8"
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateReturnQuantity(product.id, returnQuantity + 1)}
                  disabled={returnQuantity >= maxQuantity}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}