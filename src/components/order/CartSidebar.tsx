
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShoppingCart, Plus, Minus, Trash2, Star, Edit3 } from "lucide-react";
import { useSpecialPricing } from "@/hooks/useSpecialPricing";
import { format } from "date-fns";

interface CartItem {
  product: any;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CartSidebarProps {
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  onCartUpdate: (cart: CartItem[]) => void;
  onAdjustmentsChange: (adjustments: number) => void;
  onNext: () => void;
  onBack: () => void;
  children: React.ReactNode;
}

export function CartSidebar({
  cart,
  subtotal,
  adjustments,
  onCartUpdate,
  onAdjustmentsChange,
  onNext,
  onBack,
  children
}: CartSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed">("percentage");
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { hasActiveSpecial, getSpecialForProduct } = useSpecialPricing();

  const parseQuantityInput = (input: string): number => {
    const fractionMatch = input.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1]);
      const numerator = parseInt(fractionMatch[2]);
      const denominator = parseInt(fractionMatch[3]);
      return whole + (numerator / denominator);
    }
    
    const simpleFractionMatch = input.match(/^(\d+)\/(\d+)$/);
    if (simpleFractionMatch) {
      const numerator = parseInt(simpleFractionMatch[1]);
      const denominator = parseInt(simpleFractionMatch[2]);
      return numerator / denominator;
    }
    
    const decimal = parseFloat(input);
    return isNaN(decimal) ? 0 : decimal;
  };

  const formatQuantity = (quantity: number): string => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(3).replace(/\.?0+$/, '');
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const finalQuantity = Math.max(0.25, newQuantity);
    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        return { 
          ...item, 
          quantity: finalQuantity,
          total_price: item.unit_price * finalQuantity 
        };
      }
      return item;
    });
    onCartUpdate(updatedCart);
  };

  const removeFromCart = (productId: string) => {
    onCartUpdate(cart.filter(item => item.product.id !== productId));
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setInputValue(formatQuantity(currentQuantity));
  };

  const handleQuantitySubmit = (productId: string) => {
    const newQuantity = parseQuantityInput(inputValue);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity (minimum 0.25)",
        variant: "destructive",
      });
      return;
    }

    const finalQuantity = newQuantity === 0 ? 0.25 : newQuantity;
    updateQuantity(productId, finalQuantity);
    setEditingQuantity(null);
    setInputValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setInputValue("");
  };

  const applyAdjustment = () => {
    const value = parseFloat(adjustmentValue);
    if (isNaN(value)) return;

    let adjustment = 0;
    if (adjustmentType === "percentage") {
      adjustment = (subtotal * value) / 100;
    } else {
      adjustment = value;
    }

    onAdjustmentsChange(adjustment);
    setAdjustmentValue("");
  };

  const grandTotal = subtotal + adjustments;

  const CartContent = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-semibold">Cart ({cart.length} items)</span>
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCartUpdate([])}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No items in cart</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {cart.map((item) => {
              const hasSpecial = hasActiveSpecial(item.product.id);
              const originalPrice = item.product.price;
              const productSpecial = getSpecialForProduct(item.product.id);
              
              return (
                <div key={item.product.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {item.product.name}
                        {hasSpecial && (
                          <Badge className="bg-red-500 text-white flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3" />
                            SPECIAL
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hasSpecial ? (
                          <>
                            <span className="line-through">AU${originalPrice.toFixed(2)}</span>
                            <span className="text-red-600 ml-1">AU${item.unit_price.toFixed(2)} each</span>
                          </>
                        ) : (
                          `AU${item.unit_price.toFixed(2)} each`
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">AU${item.total_price.toFixed(2)}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {hasSpecial && productSpecial && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="text-red-700 font-medium">
                        {productSpecial.special_name}
                      </div>
                      <div className="text-red-600">
                        {productSpecial.discount_type === 'percentage' 
                          ? `${productSpecial.discount_value}% off` 
                          : `AU$${productSpecial.discount_value.toFixed(2)} off`
                        }
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 0.25)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    {editingQuantity === item.product.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          className="h-8 w-20 text-sm text-center"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuantitySubmit(item.product.id);
                            if (e.key === 'Escape') handleQuantityCancel();
                          }}
                          onBlur={() => handleQuantitySubmit(item.product.id)}
                          placeholder="1.25"
                          step="0.25"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantitySubmit(item.product.id)}
                          className="h-8 w-8 p-0 text-green-600"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <span 
                        className="text-sm font-medium px-3 py-1 cursor-pointer hover:bg-gray-100 rounded border min-w-[60px] text-center"
                        onClick={() => handleQuantityEdit(item.product.id, item.quantity)}
                      >
                        {formatQuantity(item.quantity)}
                      </span>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 0.25)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">AU${subtotal.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Price Adjustment</Label>
              <div className="flex gap-2">
                <Select value={adjustmentType} onValueChange={(value: "percentage" | "fixed") => setAdjustmentType(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">AU$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={applyAdjustment} variant="outline">
                  Apply
                </Button>
              </div>
            </div>

            {adjustments !== 0 && (
              <div className="flex justify-between">
                <span>Adjustments:</span>
                <span className={adjustments > 0 ? "text-red-600" : "text-green-600"}>
                  {adjustments > 0 ? '+' : ''}AU${adjustments.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total:</span>
              <span>AU${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={() => {
            onNext();
            setIsOpen(false);
          }} 
          disabled={cart.length === 0}
          className="flex-1"
        >
          Next: Delivery Details
        </Button>
      </div>
    </div>
  );

  const CartTrigger = () => (
    <Button
      className="fixed bottom-6 right-6 z-50 h-14 px-6 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
      onClick={() => setIsOpen(true)}
    >
      <ShoppingCart className="w-5 h-5 mr-2" />
      <span className="font-medium">
        Cart ({cart.length}) - AU${grandTotal.toFixed(2)}
      </span>
      {cart.length > 0 && (
        <Badge className="ml-2 bg-red-500 text-white">
          {cart.length}
        </Badge>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {children}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <CartTrigger />
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Shopping Cart</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex-1 overflow-hidden">
              <CartContent />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <CartTrigger />
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex-1 overflow-hidden">
            <CartContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
