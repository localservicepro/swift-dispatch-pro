import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Split, Plus, Minus, Calendar, CalendarDays } from "lucide-react";
import { CartItem, SplitConfig, Customer } from "./types";
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
  const [useSameDateForAll, setUseSameDateForAll] = useState(false);
  const [commonDeliveryDate, setCommonDeliveryDate] = useState("");
  const [commonDeliveryTime, setCommonDeliveryTime] = useState("");

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
        specialInstructions: "",
        sameAsBilling: true,
        deliveryAddress: ""
      });
    }
    return newSplits;
  };

  // Initialize splits when component mounts if empty
  useEffect(() => {
    if (splits.length === 0) {
      const newSplits = initializeSplits(numberOfSplits);
      onSplitsChange(newSplits);
    }
  }, []);

  const handleNumberOfSplitsChange = (count: number) => {
    setNumberOfSplits(count);
    const newSplits = initializeSplits(count);
    onSplitsChange(newSplits);
  };

  const handleSameDateToggle = (checked: boolean) => {
    setUseSameDateForAll(checked);
    if (checked && commonDeliveryDate && commonDeliveryTime) {
      // Apply common date/time to all splits
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryDate: commonDeliveryDate,
        deliveryTime: commonDeliveryTime
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const handleSeparateDeliveryDates = () => {
    setUseSameDateForAll(false);
    // Preserve current common date/time values in all splits
    if (commonDeliveryDate || commonDeliveryTime) {
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryDate: commonDeliveryDate || split.deliveryDate,
        deliveryTime: commonDeliveryTime || split.deliveryTime
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const handleCommonDateChange = (date: string) => {
    setCommonDeliveryDate(date);
    if (useSameDateForAll) {
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryDate: date
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const handleCommonTimeChange = (time: string) => {
    setCommonDeliveryTime(time);
    if (useSameDateForAll) {
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryTime: time
      }));
      onSplitsChange(updatedSplits);
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

    // Check if each split has truck type and truck ID assigned
    const allSplitsHaveDeliveryDetails = splits.every(split => 
      split.truckType && split.truckId && split.deliveryDate && split.deliveryTime
    );

    return fullyAllocated && allSplitsHaveProducts && allSplitsHaveDeliveryDetails;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Split className="w-4 h-4" />
          Step 4: Configure Order Splits
        </CardTitle>
        <p className="text-xs text-gray-600">
          Allocate your products across different splits and set delivery details for each.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Number of Splits Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Number of Splits</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNumberOfSplitsChange(Math.max(2, numberOfSplits - 1))}
              disabled={numberOfSplits <= 2}
              className="h-7 w-7 p-0"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-base font-medium w-6 text-center">{numberOfSplits}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNumberOfSplitsChange(Math.min(5, numberOfSplits + 1))}
              disabled={numberOfSplits >= 5}
              className="h-7 w-7 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-600">splits (2-5 allowed)</span>
          </div>
        </div>

        {/* Same Date for All Option */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Checkbox
              id="same-date"
              checked={useSameDateForAll}
              onCheckedChange={handleSameDateToggle}
            />
            <Label htmlFor="same-date" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Use same delivery date and time for all splits
            </Label>
          </div>
          
          {useSameDateForAll && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Common Delivery Date</Label>
                  <Input
                    type="date"
                    value={commonDeliveryDate}
                    onChange={(e) => handleCommonDateChange(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Common Delivery Time</Label>
                  <Input
                    type="time"
                    value={commonDeliveryTime}
                    onChange={(e) => handleCommonTimeChange(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeparateDeliveryDates}
                className="text-xs"
              >
                <CalendarDays className="w-3 h-3 mr-1" />
                Separate Delivery Dates
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <AllocationActions 
          cart={cart}
          splits={splits}
          onSplitsChange={onSplitsChange}
        />

        {/* Product Allocation Section */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Product Allocation</Label>
          <div className="grid gap-2">
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
          <Label className="text-sm font-medium mb-2 block">Split Details</Label>
          <div className="grid gap-3">
            {splits.map((split, index) => (
              <SplitSummaryCard
                key={split.id}
                split={split}
                splitIndex={index}
                cart={cart}
                customer={{} as Customer}
                useGlobalDeliveryAddress={false}
                onUpdateSplit={updateSplit}
                onUpdateQuantity={updateProductQuantity}
                onRemoveProduct={removeProductFromSplit}
                isCommonDateMode={useSameDateForAll}
              />
            ))}
          </div>
        </div>

        {/* Validation Message */}
        {!canProceed() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              Please ensure all products are fully allocated, each split has at least one product, and all delivery details (truck type, truck, date, time) are configured.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-3">
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
