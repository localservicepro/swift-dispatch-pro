
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Split, Plus, Minus, Package } from "lucide-react";
import { CartItem, SplitConfig, TruckType } from "./types";

interface SplitOrderConfigurationStepProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SplitOrderConfigurationStep({
  cart,
  splits,
  onSplitsChange,
  onBack,
  onNext
}: SplitOrderConfigurationStepProps) {
  const [numberOfSplits, setNumberOfSplits] = useState(splits.length || 2);

  const initializeSplits = (count: number) => {
    const newSplits: SplitConfig[] = [];
    for (let i = 0; i < count; i++) {
      newSplits.push({
        id: `split-${i + 1}`,
        name: `Split ${i + 1}`,
        products: [],
        truckType: "",
        truckId: "",
        driverId: "",
        deliveryDate: "",
        deliveryTime: "",
        specialInstructions: ""
      });
    }
    return newSplits;
  };

  const handleNumberOfSplitsChange = (count: number) => {
    setNumberOfSplits(count);
    if (count !== splits.length) {
      const newSplits = initializeSplits(count);
      onSplitsChange(newSplits);
    }
  };

  const updateSplit = (splitIndex: number, updates: Partial<SplitConfig>) => {
    const updatedSplits = splits.map((split, index) => 
      index === splitIndex ? { ...split, ...updates } : split
    );
    onSplitsChange(updatedSplits);
  };

  const addProductToSplit = (splitIndex: number, productId: string) => {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    const split = splits[splitIndex];
    const existingProduct = split.products.find(p => p.productId === productId);
    
    if (existingProduct) {
      // Increase quantity if product already in split
      const updatedProducts = split.products.map(p =>
        p.productId === productId 
          ? { ...p, quantity: Math.min(p.quantity + 1, cartItem.quantity) }
          : p
      );
      updateSplit(splitIndex, { products: updatedProducts });
    } else {
      // Add new product to split
      const updatedProducts = [...split.products, { productId, quantity: 1 }];
      updateSplit(splitIndex, { products: updatedProducts });
    }
  };

  const removeProductFromSplit = (splitIndex: number, productId: string) => {
    const split = splits[splitIndex];
    const updatedProducts = split.products.filter(p => p.productId !== productId);
    updateSplit(splitIndex, { products: updatedProducts });
  };

  const updateProductQuantity = (splitIndex: number, productId: string, quantity: number) => {
    const split = splits[splitIndex];
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    const maxQuantity = cartItem.quantity;
    const clampedQuantity = Math.max(1, Math.min(quantity, maxQuantity));

    const updatedProducts = split.products.map(p =>
      p.productId === productId ? { ...p, quantity: clampedQuantity } : p
    );
    updateSplit(splitIndex, { products: updatedProducts });
  };

  const getAvailableProducts = (splitIndex: number) => {
    return cart.filter(cartItem => {
      const allocatedQuantity = splits.reduce((total, split, index) => {
        if (index === splitIndex) return total; // Don't count current split
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity < cartItem.quantity;
    });
  };

  const canProceed = () => {
    // Check if all products are allocated
    const totalAllocated = cart.every(cartItem => {
      const allocatedQuantity = splits.reduce((total, split) => {
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity === cartItem.quantity;
    });

    // Check if each split has at least one product
    const allSplitsHaveProducts = splits.every(split => split.products.length > 0);

    return totalAllocated && allSplitsHaveProducts;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Split className="w-5 h-5" />
          Step 4: Configure Order Splits
        </CardTitle>
        <p className="text-sm text-gray-600">
          Divide your products into separate orders with different delivery details.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Number of Splits Selection */}
        <div>
          <Label className="text-base font-medium mb-3 block">Number of Splits</Label>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNumberOfSplitsChange(Math.max(2, numberOfSplits - 1))}
              disabled={numberOfSplits <= 2}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-medium w-8 text-center">{numberOfSplits}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNumberOfSplitsChange(Math.min(5, numberOfSplits + 1))}
              disabled={numberOfSplits >= 5}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">splits (2-5 allowed)</span>
          </div>
        </div>

        {/* Split Configuration */}
        <div className="space-y-4">
          {splits.map((split, index) => (
            <Card key={split.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {split.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Assignment */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Products</Label>
                  <div className="space-y-2">
                    {split.products.map(splitProduct => {
                      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                      if (!cartItem) return null;
                      
                      return (
                        <div key={splitProduct.productId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{cartItem.product.name}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max={cartItem.quantity}
                              value={splitProduct.quantity}
                              onChange={(e) => updateProductQuantity(index, splitProduct.productId, parseInt(e.target.value))}
                              className="w-16 h-8"
                            />
                            <span className="text-xs text-gray-500">/ {cartItem.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProductFromSplit(index, splitProduct.productId)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add Product Dropdown */}
                    <Select onValueChange={(productId) => addProductToSplit(index, productId)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add product to this split" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableProducts(index).map(cartItem => (
                          <SelectItem key={cartItem.product.id} value={cartItem.product.id}>
                            {cartItem.product.name} (Available: {cartItem.quantity - splits.reduce((total, s, i) => {
                              if (i === index) return total;
                              const sp = s.products.find(p => p.productId === cartItem.product.id);
                              return total + (sp?.quantity || 0);
                            }, 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Basic Delivery Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Delivery Date</Label>
                    <Input
                      type="date"
                      value={split.deliveryDate}
                      onChange={(e) => updateSplit(index, { deliveryDate: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Delivery Time</Label>
                    <Input
                      type="time"
                      value={split.deliveryTime}
                      onChange={(e) => updateSplit(index, { deliveryTime: e.target.value })}
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <Badge variant="outline">
                    {split.products.reduce((sum, p) => sum + p.quantity, 0)} items
                  </Badge>
                  <span>
                    ${split.products.reduce((sum, splitProduct) => {
                      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                      return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Validation Message */}
        {!canProceed() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Please ensure all products are allocated to splits and each split has at least one product.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!canProceed()}
            className="ml-auto"
          >
            Continue to Delivery Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
