import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, Trash2, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  images: string[];
  category?: {
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface FloatingCartProps {
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  onCartUpdate: (cart: CartItem[]) => void;
  onAdjustmentsChange: (adjustments: number) => void;
  onNext: () => void;
  onBack: () => void;
  hasActiveSpecial: (productId: string) => boolean;
  getProductPrice: (product: Product) => number;
  updateQuantity: (productId: string, newQuantity: number) => void;
  removeFromCart: (productId: string) => void;
  handleQuantityEdit: (productId: string, currentQuantity: number) => void;
  handleQuantitySubmit: (productId: string) => void;
  handleQuantityCancel: () => void;
  editingQuantity: string | null;
  inputValue: string;
  setInputValue: (value: string) => void;
  formatQuantity: (quantity: number) => string;
  applyAdjustment: () => void;
  adjustmentType: "percentage" | "fixed";
  setAdjustmentType: (type: "percentage" | "fixed") => void;
  adjustmentValue: string;
  setAdjustmentValue: (value: string) => void;
}

export function FloatingCart({
  cart,
  subtotal,
  adjustments,
  onNext,
  onBack,
  hasActiveSpecial,
  removeFromCart,
  handleQuantityEdit,
  handleQuantitySubmit,
  handleQuantityCancel,
  editingQuantity,
  inputValue,
  setInputValue,
  formatQuantity,
  updateQuantity,
  applyAdjustment,
  adjustmentType,
  setAdjustmentType,
  adjustmentValue,
  setAdjustmentValue,
}: FloatingCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const grandTotal = subtotal + adjustments;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="relative rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 px-2 py-1 min-w-[24px] h-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
                >
                  {cart.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent className="w-full sm:max-w-lg" side="right">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Shopping Cart ({cart.length} items)
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col h-full mt-6">
              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Your cart is empty</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 pb-4">
                      {cart.map((item) => {
                        const hasSpecial = hasActiveSpecial(item.product.id);
                        
                        return (
                          <div key={item.product.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex gap-3">
                              {/* Product Image */}
                              {item.product.images && item.product.images.length > 0 && (
                                <img
                                  src={item.product.images[0]}
                                  alt={item.product.name}
                                  className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                />
                              )}
                              
                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm leading-tight break-words">
                                      {item.product.name}
                                    </h4>
                                    {hasSpecial && (
                                      <Badge className="bg-red-500 text-white text-xs mt-1">
                                        SPECIAL
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Quantity and Price */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {editingQuantity === item.product.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="text"
                                          value={inputValue}
                                          onChange={(e) => setInputValue(e.target.value)}
                                          className="w-20 h-8 text-center text-sm"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleQuantitySubmit(item.product.id);
                                            } else if (e.key === 'Escape') {
                                              handleQuantityCancel();
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <Button size="sm" variant="ghost" onClick={() => handleQuantitySubmit(item.product.id)} className="h-8 px-2">
                                          ✓
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleQuantityCancel} className="h-8 px-2">
                                          ✕
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateQuantity(item.product.id, item.quantity - 0.25)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          onClick={() => handleQuantityEdit(item.product.id, item.quantity)}
                                          className="h-8 px-2 text-sm font-medium hover:bg-accent"
                                        >
                                          {formatQuantity(item.quantity)}
                                          <Edit3 className="w-3 h-3 ml-1 opacity-50" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateQuantity(item.product.id, item.quantity + 0.25)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-sm font-semibold">
                                      AU${item.total_price.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      AU${item.unit_price.toFixed(2)} each
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Adjustments Section */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Price Adjustments</Label>
                      <div className="flex gap-2">
                        <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">AU$</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="0"
                          value={adjustmentValue}
                          onChange={(e) => setAdjustmentValue(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={applyAdjustment} size="sm">
                          Apply
                        </Button>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>AU${subtotal.toFixed(2)}</span>
                      </div>
                      {adjustments !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Adjustments:</span>
                          <span className={adjustments >= 0 ? "text-green-600" : "text-red-600"}>
                            {adjustments >= 0 ? "+" : ""}AU${adjustments.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>AU${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={onBack} className="flex-1">
                        Back
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsOpen(false);
                          onNext();
                        }} 
                        className="flex-1"
                        disabled={cart.length === 0}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick Cart Summary on Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-24 right-6 z-40 pointer-events-none">
          <div className="bg-card border rounded-lg shadow-lg p-2 text-sm">
            <div className="text-center">
              <div className="font-medium">{totalItems} items</div>
              <div className="text-muted-foreground">AU${grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}