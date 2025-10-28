
import { useState } from "react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartItem, SplitConfig, Product, Customer } from "./types";
import { CompactProductTable } from "./CompactProductTable";
import { CompactSplitConfig } from "./CompactSplitConfig";
import { SplitControlsHeader } from "./SplitControlsHeader";
import { CommonDateTimeSelector } from "./CommonDateTimeSelector";
import { AddProductToSplitDialog } from "./AddProductToSplitDialog";
import { useToast } from "@/hooks/use-toast";

interface SplitConfigurationManagerProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  customer?: Customer;
}

export function SplitConfigurationManager({
  cart,
  splits,
  onSplitsChange,
  onCartChange,
  customer
}: SplitConfigurationManagerProps) {
  const { toast } = useToast();
  const [numberOfSplits, setNumberOfSplits] = useState(splits.length || 2);
  const [useSameDateForAll, setUseSameDateForAll] = useState(false);
  const [commonDeliveryDate, setCommonDeliveryDate] = useState("");
  const [commonDeliveryTime, setCommonDeliveryTime] = useState("");
  const [addProductDialog, setAddProductDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

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

  const handleAssignToSplit = (productId: string, splitIndex: number) => {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Remove product from all other splits first
    const clearedSplits = splits.map(split => ({
      ...split,
      products: split.products.filter(p => p.productId !== productId)
    }));

    // Add product to the target split with full quantity
    const updatedSplits = clearedSplits.map((split, index) => {
      if (index === splitIndex) {
        return {
          ...split,
          products: [...split.products, { productId, quantity: cartItem.quantity }]
        };
      }
      return split;
    });

    onSplitsChange(updatedSplits);
  };

  const handleUpdateSplitQuantity = (splitIndex: number, productId: string, quantity: number) => {
    const updatedSplits = splits.map((split, index) => {
      if (index === splitIndex) {
        const existingProductIndex = split.products.findIndex(p => p.productId === productId);
        
        if (quantity <= 0) {
          // Remove product from split if quantity is 0 or less
          return {
            ...split,
            products: split.products.filter(p => p.productId !== productId)
          };
        } else if (existingProductIndex >= 0) {
          // Update existing product quantity
          return {
            ...split,
            products: split.products.map((p, pIndex) => 
              pIndex === existingProductIndex ? { ...p, quantity } : p
            )
          };
        } else {
          // Add new product to split
          return {
            ...split,
            products: [...split.products, { productId, quantity }]
          };
        }
      }
      return split;
    });

    onSplitsChange(updatedSplits);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Row */}
      <SplitControlsHeader
        numberOfSplits={numberOfSplits}
        onNumberOfSplitsChange={handleNumberOfSplitsChange}
        useSameDateForAll={useSameDateForAll}
        onSameDateToggle={handleSameDateToggle}
        onAddProduct={() => setAddProductDialog(true)}
      />

      {/* Common Date/Time Controls */}
      {useSameDateForAll && (
        <CommonDateTimeSelector
          commonDeliveryDate={commonDeliveryDate}
          commonDeliveryTime={commonDeliveryTime}
          onDateSelect={handleCommonDateSelect}
          onTimeChange={handleCommonTimeChange}
        />
      )}

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
          {/* Compact Product Table with Split Quantity Controls */}
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
            customer={customer}
          />
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <AddProductToSplitDialog
        isOpen={addProductDialog}
        onClose={() => setAddProductDialog(false)}
        onAddProduct={handleAddNewProduct}
        existingProducts={cart}
      />
    </div>
  );
}
