
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Split, Plus, Minus } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { ProductAllocationCard } from "./ProductAllocationCard";
import { SplitSummaryCard } from "./SplitSummaryCard";
import { AllocationActions } from "./AllocationActions";

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

    const totalAllocated = splits.reduce((total, split) => {
      const splitProduct = split.products.find(p => p.productId === productId);
      return total + (splitProduct?.quantity || 0);
    }, 0);

    if (totalAllocated >= cartItem.quantity) return;

    const split = splits[splitIndex];
    const existingProduct = split.products.find(p => p.productId === productId);
    
    if (existingProduct) {
      const updatedProducts = split.products.map(p =>
        p.productId === productId 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      );
      updateSplit(splitIndex, { products: updatedProducts });
    } else {
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
    if (quantity <= 0) {
      removeProductFromSplit(splitIndex, productId);
      return;
    }

    const split = splits[splitIndex];
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Check total allocation across all splits
    const totalAllocatedOtherSplits = splits.reduce((total, s, index) => {
      if (index === splitIndex) return total;
      const splitProduct = s.products.find(p => p.productId === productId);
      return total + (splitProduct?.quantity || 0);
    }, 0);

    const maxAllowedForThisSplit = cartItem.quantity - totalAllocatedOtherSplits;
    const clampedQuantity = Math.min(quantity, maxAllowedForThisSplit);

    const updatedProducts = split.products.map(p =>
      p.productId === productId ? { ...p, quantity: clampedQuantity } : p
    );
    updateSplit(splitIndex, { products: updatedProducts });
  };

  const canProceed = () => {
    // Check if all products are fully allocated
    const fullyAllocated = cart.every(cartItem => {
      const allocatedQuantity = splits.reduce((total, split) => {
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity === cartItem.quantity;
    });

    // Check if each split has at least one product
    const allSplitsHaveProducts = splits.every(split => split.products.length > 0);

    return fullyAllocated && allSplitsHaveProducts;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Split className="w-5 h-5" />
          Step 4: Configure Order Splits
        </CardTitle>
        <p className="text-sm text-gray-600">
          Allocate your products across different splits and set delivery details for each.
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

        {/* Quick Actions */}
        <AllocationActions 
          cart={cart}
          splits={splits}
          onSplitsChange={onSplitsChange}
        />

        {/* Product Allocation Section */}
        <div>
          <Label className="text-base font-medium mb-3 block">Product Allocation</Label>
          <div className="grid gap-3">
            {cart.map(cartItem => (
              <ProductAllocationCard
                key={cartItem.product.id}
                cartItem={cartItem}
                splits={splits}
                onAddToSplit={addProductToSplit}
              />
            ))}
          </div>
        </div>

        {/* Split Summary Section */}
        <div>
          <Label className="text-base font-medium mb-3 block">Split Details</Label>
          <div className="grid gap-4">
            {splits.map((split, index) => (
              <SplitSummaryCard
                key={split.id}
                split={split}
                splitIndex={index}
                cart={cart}
                onUpdateSplit={updateSplit}
                onUpdateQuantity={updateProductQuantity}
                onRemoveProduct={removeProductFromSplit}
              />
            ))}
          </div>
        </div>

        {/* Validation Message */}
        {!canProceed() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Please ensure all products are fully allocated and each split has at least one product.
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
