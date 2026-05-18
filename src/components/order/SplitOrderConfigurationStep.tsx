
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Split, AlertCircle } from "lucide-react";
import { CartItem, SplitConfig, Customer } from "./types";
import { SplitConfigurationManager } from "./SplitConfigurationManager";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SplitOrderConfigurationStepProps {
  cart: CartItem[];
  splits: SplitConfig[];
  customer?: Customer;
  isPickup?: boolean;
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SplitOrderConfigurationStep({
  cart,
  splits,
  customer,
  isPickup = false,
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
    // Check if all cart items are fully allocated
    const fullyAllocated = cart.every(cartItem => {
      const allocatedQuantity = splits.reduce((total, split) => {
        const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
        return total + (splitProduct?.quantity || 0);
      }, 0);
      return allocatedQuantity === cartItem.quantity;
    });

    // Check if all splits have at least one product
    const allSplitsHaveProducts = splits.every(split => split.products.length > 0);
    
    // Check if all splits have delivery details — address only required for delivery
    const allSplitsHaveDeliveryDetails = splits.every(split => {
      const hasDateAndTime = split.deliveryDate && split.deliveryTime;

      if (isPickup) {
        return hasDateAndTime;
      }

      // Address validation: either same as billing (and customer has address) OR custom address with suburb
      const hasAddressInfo = (split.sameAsBilling && customer?.full_address) ||
        (split.deliveryAddress && split.deliveryAddress.trim() !== "" &&
         (split.suburbId || split.deliverySuburbId));

      return hasDateAndTime && hasAddressInfo;
    });

    console.log('Split validation check:', {
      fullyAllocated,
      allSplitsHaveProducts,
      allSplitsHaveDeliveryDetails,
      cartLength: cart.length,
      splitsLength: splits.length,
      customerHasAddress: !!customer?.full_address,
      splits: splits.map(s => ({
        name: s.name,
        hasProducts: s.products.length > 0,
        hasDeliveryDate: !!s.deliveryDate,
        hasDeliveryTime: !!s.deliveryTime,
        hasAddressInfo: (s.sameAsBilling && !!customer?.full_address) || (!!s.deliveryAddress && !!(s.suburbId || s.deliverySuburbId)),
        productsCount: s.products.length,
        deliveryDate: s.deliveryDate,
        deliveryTime: s.deliveryTime,
        deliveryAddress: s.deliveryAddress,
        sameAsBilling: s.sameAsBilling,
        suburbId: s.suburbId,
        deliverySuburbId: s.deliverySuburbId
      })),
      cart: cart.map(c => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        allocated: splits.reduce((total, split) => {
          const splitProduct = split.products.find(p => p.productId === c.product.id);
          return total + (splitProduct?.quantity || 0);
        }, 0)
      }))
    });

    // Must have cart items and splits to proceed
    const hasRequiredData = cart.length > 0 && splits.length > 0;

    return hasRequiredData && fullyAllocated && allSplitsHaveProducts && allSplitsHaveDeliveryDetails;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Split className="w-4 h-4" />
          Step 5: Configure Order Splits
        </CardTitle>
        <p className="text-xs text-gray-600">
          {isPickup
            ? "Split this order into multiple pickups. Each split can have its own pickup date and time."
            : "Split this order for different delivery addresses or dates. Each split can be delivered to a unique address."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Address Configuration Alert — only for delivery */}
        {!isPickup && (!customer?.full_address && splits.some(s => s.sameAsBilling)) && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 text-xs">
              Customer billing address is missing. Please provide delivery addresses for each split or update the customer's billing address.
            </AlertDescription>
          </Alert>
        )}

        <SplitConfigurationManager
          cart={cart}
          splits={splits}
          onSplitsChange={onSplitsChange}
          onCartChange={onCartChange}
          customer={customer}
          isPickup={isPickup}
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
