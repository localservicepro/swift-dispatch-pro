
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit3, Trash2 } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { useToast } from "@/hooks/use-toast";

interface SimpleProductAllocationProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onQuantityChange?: (productId: string, newQuantity: number) => void;
  onRemoveFromCart?: (productId: string) => void;
  onAssignToSplit: (productId: string, splitIndex: number) => void;
}

export function SimpleProductAllocation({ 
  cart, 
  splits, 
  onQuantityChange,
  onRemoveFromCart,
  onAssignToSplit
}: SimpleProductAllocationProps) {
  const { toast } = useToast();
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState("");

  const getProductSplitAssignment = (productId: string) => {
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      if (split.products.some(p => p.productId === productId)) {
        return i;
      }
    }
    return -1; // Not assigned
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantitySubmit = (productId: string) => {
    const newQuantity = parseInt(tempQuantity);
    
    if (isNaN(newQuantity) || newQuantity < 1) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity (minimum 1)",
        variant: "destructive",
      });
      return;
    }

    onQuantityChange?.(productId, newQuantity);
    setEditingQuantity(null);
  };

  const handleAssignToSplit = (productId: string, splitIndex: number) => {
    onAssignToSplit(productId, splitIndex);
    toast({
      title: "Product assigned",
      description: `Product assigned to ${splits[splitIndex].name}`,
    });
  };

  const handleDeleteProduct = (productId: string) => {
    onRemoveFromCart?.(productId);
  };

  return (
    <div className="space-y-3">
      {cart.map(cartItem => {
        const assignedSplitIndex = getProductSplitAssignment(cartItem.product.id);
        
        return (
          <Card key={cartItem.product.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{cartItem.product.name}</h4>
                    <p className="text-xs text-gray-500">AU${cartItem.unit_price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Qty:</span>
                    {editingQuantity === cartItem.product.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(e.target.value)}
                          className="h-7 w-16 text-xs text-center"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuantitySubmit(cartItem.product.id);
                            if (e.key === 'Escape') setEditingQuantity(null);
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantitySubmit(cartItem.product.id)}
                          className="h-6 w-6 p-0 text-green-600"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{cartItem.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityEdit(cartItem.product.id, cartItem.quantity)}
                          className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                {/* Assignment Status */}
                {assignedSplitIndex >= 0 ? (
                  <Badge variant="default" className="text-xs">
                    Assigned to {splits[assignedSplitIndex].name}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Not assigned
                  </Badge>
                )}

                {/* Assignment Buttons */}
                <div className="flex gap-2">
                  {splits.map((split, splitIndex) => (
                    <Button
                      key={split.id}
                      variant={assignedSplitIndex === splitIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAssignToSplit(cartItem.product.id, splitIndex)}
                      className="text-xs h-7"
                    >
                      Add to {split.name}
                    </Button>
                  ))}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProduct(cartItem.product.id)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
