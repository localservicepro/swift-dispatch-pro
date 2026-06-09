
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
import { fixPrecision } from "@/utils/categoryUtils";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";

interface SplitConfigurationManagerProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onSplitsChange: (splits: SplitConfig[]) => void;
  onCartChange?: (cart: CartItem[]) => void;
  customer?: Customer;
  isPickup?: boolean;
}

export function SplitConfigurationManager({
  cart,
  splits,
  onSplitsChange,
  onCartChange,
  customer,
  isPickup = false
}: SplitConfigurationManagerProps) {
  const { toast } = useToast();
  const { fetchSuburbData, parseDeliveryRate } = useDeliveryFeeCalculation();
  const { handleAutoSuburbSelection } = useSuburbManagement();
  const [numberOfSplits, setNumberOfSplits] = useState(splits.length || 2);
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [useSameDateTime, setUseSameDateTime] = useState(false);
  const [commonDeliveryDate, setCommonDeliveryDate] = useState("");
  const [commonDeliveryTime, setCommonDeliveryTime] = useState("");
  const [commonSameAsBilling, setCommonSameAsBilling] = useState(true);
  const [commonDeliveryAddress, setCommonDeliveryAddress] = useState("");
  const [commonDeliverySuburbId, setCommonDeliverySuburbId] = useState("");
  const [addProductDialog, setAddProductDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

  // Apply common values to every split. `scope` controls which fields are written.
  const applyCommonToAllSplits = async (
    scope: { dateTime?: boolean; address?: boolean },
    overrides?: Partial<{
      deliveryDate: string;
      deliveryTime: string;
      sameAsBilling: boolean;
      deliveryAddress: string;
      deliverySuburbId: string;
    }>
  ) => {
    const date = overrides?.deliveryDate ?? commonDeliveryDate;
    const time = overrides?.deliveryTime ?? commonDeliveryTime;
    const sameAsBilling = overrides?.sameAsBilling ?? commonSameAsBilling;
    const address = overrides?.deliveryAddress ?? commonDeliveryAddress;
    const suburbId = overrides?.deliverySuburbId ?? commonDeliverySuburbId;

    // Resolve fee from the chosen suburb (full rate per split — never divided)
    let fee: number | undefined;
    const effectiveSuburbId = !isPickup && scope.address
      ? (sameAsBilling ? customer?.suburb_id : suburbId)
      : undefined;
    if (effectiveSuburbId) {
      const data = await fetchSuburbData(effectiveSuburbId);
      if (data) fee = parseDeliveryRate(data.delivery_rate);
    }

    const updated = splits.map(s => {
      const next: SplitConfig = { ...s };
      if (scope.dateTime) {
        if (date) next.deliveryDate = date;
        if (time) next.deliveryTime = time;
      }
      if (scope.address && !isPickup) {
        next.sameAsBilling = sameAsBilling;
        if (sameAsBilling) {
          next.deliveryAddress = customer?.full_address || "";
          next.deliverySuburbId = customer?.suburb_id;
        } else {
          next.deliveryAddress = address;
          next.deliverySuburbId = suburbId;
        }
        if (fee !== undefined) next.deliveryFee = fee;
      }
      return next;
    });
    onSplitsChange(updated);
  };

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
        deliveryAddress: "",
        deliveryFee: undefined
      });
    }
    return newSplits;
  };

  const handleNumberOfSplitsChange = (count: number) => {
    setNumberOfSplits(count);
    const newSplits = initializeSplits(count);
    onSplitsChange(newSplits);
  };

  const handleSameAddressToggle = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked) {
      applyCommonToAllSplits({ address: true });
    }
  };

  const handleSameDateTimeToggle = (checked: boolean) => {
    setUseSameDateTime(checked);
    if (checked) {
      applyCommonToAllSplits({ dateTime: true });
    }
  };

  const handleCommonDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setCommonDeliveryDate(dateString);
      if (useSameDateTime) {
        applyCommonToAllSplits({ dateTime: true }, { deliveryDate: dateString });
      }
    }
  };

  const handleCommonTimeChange = (time: string) => {
    setCommonDeliveryTime(time);
    if (useSameDateTime) {
      applyCommonToAllSplits({ dateTime: true }, { deliveryTime: time });
    }
  };

  const handleCommonSameAsBillingToggle = (sameAsBilling: boolean) => {
    setCommonSameAsBilling(sameAsBilling);
    if (useSameAddress) {
      applyCommonToAllSplits({ address: true }, { sameAsBilling });
    }
  };

  const handleCommonAddressChange = (address: string) => {
    setCommonDeliveryAddress(address);
    if (useSameAddress && !commonSameAsBilling) {
      applyCommonToAllSplits({ address: true }, { deliveryAddress: address });
    }
  };

  const handleCommonAddressSelect = (addressData: any) => {
    const addr = addressData?.fullAddress || "";
    setCommonDeliveryAddress(addr);
    handleAutoSuburbSelection(addr, (suburbId: string) => {
      setCommonDeliverySuburbId(suburbId);
      if (useSameAddress && !commonSameAsBilling) {
        applyCommonToAllSplits({ address: true }, { deliveryAddress: addr, deliverySuburbId: suburbId });
      }
    });
    if (useSameAddress && !commonSameAsBilling) {
      applyCommonToAllSplits({ address: true }, { deliveryAddress: addr });
    }
  };

  const handleCommonSuburbChange = (suburbId: string) => {
    setCommonDeliverySuburbId(suburbId);
    if (useSameAddress && !commonSameAsBilling) {
      applyCommonToAllSplits({ address: true }, { deliverySuburbId: suburbId });
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
    const fixedQuantity = fixPrecision(quantity);
    
    const updatedSplits = splits.map((split, index) => {
      if (index === splitIndex) {
        const existingProductIndex = split.products.findIndex(p => p.productId === productId);
        
        if (fixedQuantity <= 0) {
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
              pIndex === existingProductIndex ? { ...p, quantity: fixedQuantity } : p
            )
          };
        } else {
          // Add new product to split
          return {
            ...split,
            products: [...split.products, { productId, quantity: fixedQuantity }]
          };
        }
      }
      return split;
    });

    onSplitsChange(updatedSplits);
  };

  const handleResetAllocations = () => {
    const clearedSplits = splits.map(split => ({
      ...split,
      products: []
    }));
    onSplitsChange(clearedSplits);
    toast({
      title: "Allocations reset",
      description: "All product allocations have been cleared",
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Row */}
      <SplitControlsHeader
        numberOfSplits={numberOfSplits}
        onNumberOfSplitsChange={handleNumberOfSplitsChange}
        useSameAddress={useSameAddress}
        onSameAddressToggle={handleSameAddressToggle}
        useSameDateTime={useSameDateTime}
        onSameDateTimeToggle={handleSameDateTimeToggle}
        onAddProduct={() => setAddProductDialog(true)}
      />

      {/* Common Date/Time and/or Address Controls */}
      {(useSameDateTime || useSameAddress) && (
        <CommonDateTimeSelector
          commonDeliveryDate={commonDeliveryDate}
          commonDeliveryTime={commonDeliveryTime}
          onDateSelect={handleCommonDateSelect}
          onTimeChange={handleCommonTimeChange}
          showDateTime={useSameDateTime}
          showAddress={useSameAddress}
          customer={customer}
          isPickup={isPickup}
          commonSameAsBilling={commonSameAsBilling}
          commonDeliveryAddress={commonDeliveryAddress}
          commonDeliverySuburbId={commonDeliverySuburbId}
          onSameAsBillingToggle={handleCommonSameAsBillingToggle}
          onAddressChange={handleCommonAddressChange}
          onAddressSelect={handleCommonAddressSelect}
          onSuburbChange={handleCommonSuburbChange}
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
            onResetAllocations={handleResetAllocations}
          />
        </TabsContent>
        
        <TabsContent value="delivery" className="space-y-4 mt-4">
          <CompactSplitConfig
            splits={splits}
            cart={cart}
            onUpdateSplit={updateSplit}
            onSplitsChange={onSplitsChange}
            isCommonDateTimeMode={useSameDateTime}
            isCommonAddressMode={useSameAddress}
            customer={customer}
            isPickup={isPickup}
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
