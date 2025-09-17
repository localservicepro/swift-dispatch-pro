
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Split } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { SplitConfigurationManager } from "./SplitConfigurationManager";

interface SplitOrderConfigurationStepProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SplitOrderConfigurationStep({
  cart,
  splits,
  onSplitsChange,
  onCartChange,
  onBack,
  onNext
}: SplitOrderConfigurationStepProps) {
  const initializeSplits = (count: number) => {
    const newSplits: SplitConfig[] = [];
    for (let i = 0; i < count; i++) {
      newSplits.push({
        id: `split-${i + 1}`,
        name: `Split ${i + 1}`,
        products: [],
        deliveryDate: "",
        deliveryTime: "",
        specialInstructions: "",
        sameAsBilling: true,
        deliveryAddress: ""
      });
    }
    return newSplits;
  };

  useEffect(() => {
    if (splits.length === 0) {
      const newSplits = initializeSplits(2);
      onSplitsChange(newSplits);
    }
  }, []);

  const canProceed = () => {
    const fullyAllocated = cart.every(cartItem => {
      const allocatedQuantity = splits.reduce((total, split) => {
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity === cartItem.quantity;
    });

    const allSplitsHaveProducts = splits.every(split => split.products.length > 0);
    const allSplitsHaveDeliveryDetails = splits.every(split => 
      split.deliveryDate && split.deliveryTime
    );

    console.log('Split validation check:', {
      fullyAllocated,
      allSplitsHaveProducts,
      allSplitsHaveDeliveryDetails,
      splits: splits.map(s => ({
        name: s.name,
        hasProducts: s.products.length > 0,
        hasDeliveryDate: !!s.deliveryDate,
        hasDeliveryTime: !!s.deliveryTime,
        productsCount: s.products.length
      }))
    });

    return fullyAllocated && allSplitsHaveProducts && allSplitsHaveDeliveryDetails;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Split className="w-4 h-4" />
          Step 4: Configure Order Splits
        </CardTitle>
        <p className="text-xs text-gray-600">
          Allocate products across splits and configure delivery details efficiently.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SplitConfigurationManager
          cart={cart}
          splits={splits}
          onSplitsChange={onSplitsChange}
          onCartChange={onCartChange}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onBack} size="sm">
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!canProceed()}
            className="ml-auto"
            size="sm"
          >
            Continue to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
