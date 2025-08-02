import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, Plus, Minus, ShoppingCart, Star, Clock, Edit3, Trash2 } from "lucide-react";
import { useSpecialPricing } from "@/hooks/useSpecialPricing";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";

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

interface ProductSelectionStepProps {
  cart: CartItem[];
  subtotal: number;
  adjustments: number;
  onCartUpdate: (cart: CartItem[]) => void;
  onAdjustmentsChange: (adjustments: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ProductSelectionStep({
  cart,
  subtotal,
  adjustments,
  onCartUpdate,
  onAdjustmentsChange,
  onNext,
  onBack
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed">("percentage");
  const [adjustmentValue, setAdjustmentValue] = useState<string>("");
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [specialsLoading, setSpecialsLoading] = useState(false);
  const { toast } = useToast();
  const { loadSpecialsForProducts, hasActiveSpecial, getSpecialForProduct, applySpecialDiscount } = useSpecialPricing();
  
  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Add decimal input parsing function
  const parseQuantityInput = (input: string): number => {
    // Handle fractional input like "1 1/4" or "1.25"
    const fractionMatch = input.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1]);
      const numerator = parseInt(fractionMatch[2]);
      const denominator = parseInt(fractionMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fraction like "1/4"
    const simpleFractionMatch = input.match(/^(\d+)\/(\d+)$/);
    if (simpleFractionMatch) {
      const numerator = parseInt(simpleFractionMatch[1]);
      const denominator = parseInt(simpleFractionMatch[2]);
      return numerator / denominator;
    }
    
    // Handle decimal input
    const decimal = parseFloat(input);
    return isNaN(decimal) ? 0 : decimal;
  };

  const formatQuantity = (quantity: number): string => {
    // Format to show up to 3 decimal places, removing trailing zeros
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(3).replace(/\.?0+$/, '');
  };

  // Memoized functions to prevent unnecessary re-renders
  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name');

    if (debouncedSearchQuery) {
      query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%,sku.ilike.%${debouncedSearchQuery}%`);
    }

    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq('category_id', selectedCategory);
    }

    const { data, error } = await query.limit(200);

    if (!error && data) {
      // Ensure images array exists for each product
      const productsWithImages = data.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setProducts(productsWithImages);
    }
    setLoading(false);
  }, [debouncedSearchQuery, selectedCategory]);

  const loadSpecialsForProductsBatched = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0 || specialsLoading) return;
    
    setSpecialsLoading(true);
    try {
      await loadSpecialsForProducts(productIds);
    } finally {
      setSpecialsLoading(false);
    }
  }, [loadSpecialsForProducts, specialsLoading]);

  // Load categories and set up realtime subscription on mount
  useEffect(() => {
    loadCategories();

    // Set up realtime subscription with proper cleanup
    const channel = supabase
      .channel('product-selection-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Products table changed, reloading...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up product selection subscription...');
      supabase.removeChannel(channel);
    };
  }, [loadCategories, loadProducts]);

  // Load products when search or category changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load specials when products change
  useEffect(() => {
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      loadSpecialsForProductsBatched(productIds);
    }
  }, [products, loadSpecialsForProductsBatched]);


  const getProductPrice = useCallback((product: Product) => {
    // Apply special pricing if available
    return hasActiveSpecial(product.id) ? applySpecialDiscount(product.price, product.id) : product.price;
  }, [hasActiveSpecial, applySpecialDiscount]);

  const addToCart = useCallback((product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    const price = getProductPrice(product);
    
    if (existingItem) {
      const finalQuantity = Math.max(0.25, existingItem.quantity + 0.25);
      const updatedCart = cart.map(item => {
        if (item.product.id === product.id) {
          return { 
            ...item, 
            quantity: finalQuantity, 
            unit_price: price,
            total_price: price * finalQuantity 
          };
        }
        return item;
      });
      onCartUpdate(updatedCart);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unit_price: price,
        total_price: price * 1
      };
      onCartUpdate([...cart, newItem]);
    }
  }, [cart, getProductPrice, onCartUpdate]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    // Set minimum quantity to 0.25 instead of removing
    const finalQuantity = Math.max(0.25, newQuantity);

    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        const price = getProductPrice(item.product);
        return { 
          ...item, 
          quantity: finalQuantity, 
          unit_price: price,
          total_price: price * finalQuantity 
        };
      }
      return item;
    });
    onCartUpdate(updatedCart);
  }, [cart, getProductPrice, onCartUpdate]);

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

    // Set minimum quantity to 0.25 if user enters 0
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

  const getCartQuantity = useCallback((productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }, [cart]);

  const grandTotal = subtotal + adjustments;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search and Selection */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Step 2: Select Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name, description, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading && <div className="text-center py-4">Loading products...</div>}

            {!loading && (
              <div className="text-sm text-gray-600 mb-2">
                Showing {products.length} product{products.length !== 1 ? 's' : ''} {searchQuery && `for "${searchQuery}"`}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {products.map((product) => {
                const productSpecial = getSpecialForProduct(product.id);
                const originalPrice = product.price;
                const currentPrice = getProductPrice(product);
                const hasSpecial = hasActiveSpecial(product.id) && currentPrice !== originalPrice;

                return (
                  <div key={product.id} className="border rounded-lg p-4 relative">
                    {hasSpecial && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-red-500 text-white flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3" />
                          SPECIAL
                        </Badge>
                      </div>
                    )}

                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        {product.category?.name && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {hasSpecial ? (
                          <div>
                            <div className="text-xs text-gray-500 line-through">
                              AU${originalPrice.toFixed(2)}
                            </div>
                            <div className="font-semibold text-red-600">
                              AU${currentPrice.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold text-green-600">
                            AU${currentPrice.toFixed(2)}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">Stock: {product.stock_quantity}</div>
                      </div>
                    </div>

                    {/* Special Details */}
                    {productSpecial && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <div className="text-red-700 font-medium">
                          {productSpecial.special_name}
                        </div>
                        <div className="text-red-600">
                          {productSpecial.discount_type === 'percentage' 
                            ? `${productSpecial.discount_value}% off` 
                            : `AU$${productSpecial.discount_value.toFixed(2)} off`
                          }
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <Clock className="w-3 h-3" />
                          Ends: {format(new Date(productSpecial.end_date), 'MMM d')}
                        </div>
                      </div>
                    )}
                    
                    {product.description && (
                      <p className="text-xs text-gray-600 mb-2">{product.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {product.sku && (
                        <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                      )}
                      
                      {getCartQuantity(product.id) > 0 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(product.id, getCartQuantity(product.id) - 0.25)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium">{formatQuantity(getCartQuantity(product.id))}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(product.id, getCartQuantity(product.id) + 0.25)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => addToCart(product)}>
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items in cart
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cart.map((item) => {
                    const hasSpecial = hasActiveSpecial(item.product.id);
                    const originalPrice = item.product.price;
                    
                    return (
                      <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            {item.product.name}
                            {hasSpecial && <Star className="w-3 h-3 text-red-500" />}
                          </div>
                          <div className="text-xs text-gray-500">
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
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 0.25)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            {editingQuantity === item.product.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={inputValue}
                                  onChange={(e) => setInputValue(e.target.value)}
                                  className="h-6 w-16 text-xs text-center"
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
                                  className="h-5 w-5 p-0 text-green-600"
                                >
                                  ✓
                                </Button>
                              </div>
                            ) : (
                              <span 
                                className="text-sm font-medium w-12 text-center cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                                onClick={() => handleQuantityEdit(item.product.id, item.quantity)}
                              >
                                {formatQuantity(item.quantity)}
                              </span>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 0.25)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
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
                    );
                  })}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">AU${subtotal.toFixed(2)}</span>
                  </div>

                  {/* Price Adjustments */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Price Adjustment</Label>
                    <div className="flex gap-2">
                      <Select value={adjustmentType} onValueChange={(value: "percentage" | "fixed") => setAdjustmentType(value)}>
                        <SelectTrigger className="w-24">
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

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button 
                onClick={onNext} 
                disabled={cart.length === 0}
                className="ml-auto"
              >
                Next: Delivery Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
