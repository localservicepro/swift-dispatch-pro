import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Split, Plus, Minus, Calendar as CalendarIcon, Clock, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartItem, SplitConfig, Product } from "./types";
import { CompactProductTable } from "./CompactProductTable";
import { CompactSplitConfig } from "./CompactSplitConfig";
import { SplitProgressIndicator } from "./SplitProgressIndicator";
import { AllocationActions } from "./AllocationActions";
import { AddProductToSplitDialog } from "./AddProductToSplitDialog";
import { useToast } from "@/hooks/use-toast";

interface SplitOrderConfigurationStepProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const generateTimeSlots = () => {
  const timeSlots = [];
  for (let hour = 8; hour <= 16; hour++) {
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
    timeSlots.push({ value: time24, label: time12 });
  }
  return timeSlots;
};

export function SplitOrderConfigurationStep({
  cart,
  splits,
  onSplitsChange,
  onCartChange,
  onBack,
  onNext
}: SplitOrderConfigurationStepProps) {
  const { toast } = useToast();
  const [numberOfSplits, setNumberOfSplits] = useState(splits.length || 2);
  const [useSameDateForAll, setUseSameDateForAll] = useState(false);
  const [commonDeliveryDate, setCommonDeliveryDate] = useState("");
  const [commonDeliveryTime, setCommonDeliveryTime] = useState("");
  const [addProductDialog, setAddProductDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

  const timeSlots = generateTimeSlots();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const selectedCommonDate = commonDeliveryDate ? new Date(commonDeliveryDate) : undefined;

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
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryDate: commonDeliveryDate,
        deliveryTime: commonDeliveryTime
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const handleCommonDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setCommonDeliveryDate(dateString);
      if (useSameDateForAll) {
        const updatedSplits = splits.map(split => ({
          ...split,
          deliveryDate: dateString
        }));
        onSplitsChange(updatedSplits);
      }
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

  const replaceProductInSplit = (splitIndex: number, currentProductId: string, newProduct: any, quantity: number) => {
    const split = splits[splitIndex];
    
    // Remove the current product and add the new product
    const updatedProducts = split.products
      .filter(p => p.productId !== currentProductId)
      .concat([{ productId: newProduct.id, quantity }]);
    
    updateSplit(splitIndex, { products: updatedProducts });

    // Update the cart to include the new product if it's not already there
    const existingCartItem = cart.find(item => item.product.id === newProduct.id);
    if (!existingCartItem) {
      // This is a simplified approach - in a real implementation, you might want to
      // handle this through a proper cart management system
      console.log('New product added to split:', newProduct);
    }
  };

  const handleAddNewProduct = (product: Product, quantity: number) => {
    if (!onCartChange) {
      toast({
        title: "Error",
        description: "Cannot add product - cart update function not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const existingCartItemIndex = cart.findIndex(item => item.product.id === product.id);
      
      let updatedCart: CartItem[];
      
      if (existingCartItemIndex >= 0) {
        updatedCart = cart.map((item, index) => {
          if (index === existingCartItemIndex) {
            const newQuantity = item.quantity + quantity;
            return {
              ...item,
              quantity: newQuantity,
              total_price: item.unit_price * newQuantity
            };
          }
          return item;
        });
      } else {
        const newCartItem: CartItem = {
          product,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity
        };
        updatedCart = [...cart, newCartItem];
      }

      onCartChange([...updatedCart]);

      toast({
        title: "Success",
        description: `${product.name} has been added to your order`,
      });

    } catch (error) {
      console.error('Error adding product to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add product to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

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

    return fullyAllocated && allSplitsHaveProducts && allSplitsHaveDeliveryDetails;
  };

  const handleCartQuantityChange = (productId: string, newQuantity: number) => {
    if (!onCartChange) {
      toast({
        title: "Error",
        description: "Cannot update quantity - cart update function not available",
        variant: "destructive",
      });
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total_price: item.unit_price * newQuantity
        };
      }
      return item;
    });

    onCartChange(updatedCart);
  };

  const handleRemoveFromCart = (productId: string) => {
    if (!onCartChange) {
      toast({
        title: "Error",
        description: "Cannot remove product - cart update function not available",
        variant: "destructive",
      });
      return;
    }

    const updatedCart = cart.filter(item => item.product.id !== productId);
    onCartChange(updatedCart);

    const updatedSplits = splits.map(split => ({
      ...split,
      products: split.products.filter(p => p.productId !== productId)
    }));
    onSplitsChange(updatedSplits);
  };

  const handleUpdateSplitQuantity = (splitIndex: number, productId: string, quantity: number) => {
    const split = splits[splitIndex];
    
    if (quantity === 0) {
      const updatedProducts = split.products.filter(p => p.productId !== productId);
      updateSplit(splitIndex, { products: updatedProducts });
    } else {
      const existingProduct = split.products.find(p => p.productId === productId);
      
      if (existingProduct) {
        const updatedProducts = split.products.map(p =>
          p.productId === productId ? { ...p, quantity } : p
        );
        updateSplit(splitIndex, { products: updatedProducts });
      } else {
        const updatedProducts = [...split.products, { productId, quantity }];
        updateSplit(splitIndex, { products: updatedProducts });
      }
    }
  };

  return (
    <>
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
          {/* Top Controls Row */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            {/* Number of Splits */}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Splits:</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNumberOfSplitsChange(Math.max(2, numberOfSplits - 1))}
                  disabled={numberOfSplits <= 2}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-sm font-medium w-4 text-center">{numberOfSplits}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNumberOfSplitsChange(Math.min(5, numberOfSplits + 1))}
                  disabled={numberOfSplits >= 5}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Common Date Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="same-date"
                checked={useSameDateForAll}
                onCheckedChange={handleSameDateToggle}
              />
              <Label htmlFor="same-date" className="text-sm">Same date/time for all</Label>
            </div>

            {/* Add Product Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddProductDialog(true)}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              <Package className="w-3 h-3 mr-1" />
              Add Product
            </Button>
          </div>

          {/* Common Date/Time Controls */}
          {useSameDateForAll && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Common Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 text-xs",
                          !commonDeliveryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {commonDeliveryDate ? format(new Date(commonDeliveryDate), 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedCommonDate}
                        onSelect={handleCommonDateSelect}
                        disabled={(date) => date < tomorrow}
                        initialFocus
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-1 block">Common Time</Label>
                  <Select value={commonDeliveryTime} onValueChange={handleCommonTimeChange}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <Clock className="mr-2 h-3 w-3" />
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <SplitProgressIndicator cart={cart} splits={splits} />

          {/* Main Content - Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="allocation" className="text-sm">
                Product Allocation
              </TabsTrigger>
              <TabsTrigger value="delivery" className="text-sm">
                Delivery Details
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="allocation" className="space-y-4 mt-4">
              {/* Quick Actions */}
              <AllocationActions 
                cart={cart}
                splits={splits}
                onSplitsChange={onSplitsChange}
                onCartChange={onCartChange}
              />

              {/* Product Allocation Table */}
              <CompactProductTable
                cart={cart}
                splits={splits}
                onQuantityChange={handleCartQuantityChange}
                onRemoveFromCart={handleRemoveFromCart}
                onUpdateSplitQuantity={handleUpdateSplitQuantity}
              />
            </TabsContent>
            
            <TabsContent value="delivery" className="space-y-4 mt-4">
              <CompactSplitConfig
                splits={splits}
                cart={cart}
                onUpdateSplit={updateSplit}
                isCommonDateMode={useSameDateForAll}
              />
            </TabsContent>
          </Tabs>

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

      {/* Add Product Dialog */}
      <AddProductToSplitDialog
        isOpen={addProductDialog}
        onClose={() => setAddProductDialog(false)}
        onAddProduct={handleAddNewProduct}
        existingProducts={cart}
      />
    </>
  );
}
