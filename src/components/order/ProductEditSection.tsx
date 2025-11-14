
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Plus, Minus, X } from "lucide-react";
import { ProductStockFilter } from "./ProductStockFilter";
import { getQuantityIncrement, getQuantityInputStep, getMinimumQuantity, getDefaultQuantity, validateQuantity, roundToValidQuantity, getQuantityErrorMessage } from "@/utils/categoryUtils";

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
    allows_fractional_quantities?: boolean;
  };
}

interface ProductEditSectionProps {
  currentProducts: any[];
  onProductsChange: (products: any[]) => void;
  onSubtotalChange: (subtotal: number) => void;
}

export function ProductEditSection({
  currentProducts,
  onProductsChange,
  onSubtotalChange
}: ProductEditSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProductDetails, setCurrentProductDetails] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  // Calculate subtotal from current products
  const subtotal = useMemo(() => {
    return currentProducts.reduce((sum, item) => sum + ((item.price || 0) * parseFloat(item.quantity || 0)), 0);
  }, [currentProducts]);

  // Update parent when subtotal changes
  useEffect(() => {
    onSubtotalChange(subtotal);
  }, [subtotal, onSubtotalChange]);

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

  // Load product details for current products in the order
  const loadCurrentProductDetails = useCallback(async () => {
    if (currentProducts.length === 0) {
      setCurrentProductDetails([]);
      return;
    }

    const productIds = currentProducts.map(item => item.id);
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name, allows_fractional_quantities)
      `)
      .in('id', productIds);

    if (!error && data) {
      const productsWithImages = data.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setCurrentProductDetails(productsWithImages);
    }
  }, [currentProducts]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name, allows_fractional_quantities)
      `)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: false })
      .order('name');

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
    }

    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq('category_id', selectedCategory);
    }

    // Apply stock filter
    if (stockFilter !== "all") {
      switch (stockFilter) {
        case "in_stock":
          query = query.gt('stock_quantity', 0);
          break;
        case "low_stock":
          query = query.gte('stock_quantity', 1).lte('stock_quantity', 10);
          break;
        case "out_of_stock":
          query = query.eq('stock_quantity', 0);
          break;
        case "backorder":
          query = query.lt('stock_quantity', 0);
          break;
      }
    }

    const { data, error } = await query.limit(500);

    if (!error && data) {
      const productsWithImages = data.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setProducts(productsWithImages);
    }
    setLoading(false);
  }, [searchQuery, selectedCategory, stockFilter]);

  // Load current product details when currentProducts changes
  useEffect(() => {
    loadCurrentProductDetails();
  }, [loadCurrentProductDetails]);

  useEffect(() => {
    if (showSearch) {
      loadCategories();
      loadProducts();
    }
  }, [showSearch, loadCategories, loadProducts]);

  const addToCart = useCallback((product: Product) => {
    const existingItemIndex = currentProducts.findIndex(item => item.id === product.id);
    const increment = getQuantityIncrement(product);
    const defaultQuantity = getDefaultQuantity(product);
    
    if (existingItemIndex >= 0) {
      const updatedProducts = [...currentProducts];
      const currentQty = parseFloat(updatedProducts[existingItemIndex].quantity);
      updatedProducts[existingItemIndex] = {
        ...updatedProducts[existingItemIndex],
        quantity: currentQty + increment
      };
      onProductsChange(updatedProducts);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: defaultQuantity
      };
      onProductsChange([...currentProducts, newItem]);
    }
  }, [currentProducts, onProductsChange]);

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

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setInputValue(formatQuantity(currentQuantity));
  };

  const handleQuantitySubmit = (productId: string) => {
    const product = currentProductDetails.find(p => p.id === productId) || products.find(p => p.id === productId);
    if (!product) return;

    const newQuantity = parseQuantityInput(inputValue);
    const minQuantity = getMinimumQuantity(product);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({
        title: "Invalid quantity",
        description: getQuantityErrorMessage(product),
        variant: "destructive",
      });
      return;
    }

    if (!validateQuantity(newQuantity, product)) {
      toast({
        title: "Invalid quantity",
        description: getQuantityErrorMessage(product),
        variant: "destructive",
      });
      return;
    }

    const finalQuantity = newQuantity === 0 ? minQuantity : newQuantity;
    
    const updatedProducts = currentProducts.map(item => 
      item.id === productId 
        ? { ...item, quantity: finalQuantity }
        : item
    );
    onProductsChange(updatedProducts);
    setEditingQuantity(null);
    setInputValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setInputValue("");
  };

  const updateQuantity = useCallback((productId: string, change: number) => {
    const product = currentProductDetails.find(p => p.id === productId) || products.find(p => p.id === productId);
    if (!product) return;
    
    const minQuantity = getMinimumQuantity(product);
    const updatedProducts = currentProducts.map(item => 
      item.id === productId 
        ? { ...item, quantity: Math.max(minQuantity, parseFloat(item.quantity) + change) }
        : item
    );
    onProductsChange(updatedProducts);
  }, [currentProducts, onProductsChange, currentProductDetails, products]);

  const removeFromCart = useCallback((productId: string) => {
    const updatedProducts = currentProducts.filter(item => item.id !== productId);
    onProductsChange(updatedProducts);
  }, [currentProducts, onProductsChange]);

  const getCartQuantity = useCallback((productId: string) => {
    const item = currentProducts.find(item => item.id === productId);
    return item ? parseFloat(item.quantity) : 0;
  }, [currentProducts]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products & Quantities
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
            >
              {showSearch ? "Hide Search" : "Add Products"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Products */}
          <div className="space-y-2">
            <h4 className="font-medium">Current Products</h4>
            {currentProducts.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No products in order
              </div>
            ) : (
              <div className="space-y-2">
                {currentProducts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">${(item.price || 0).toFixed(2)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const product = currentProductDetails.find(p => p.id === item.id) || products.find(p => p.id === item.id);
                            if (product) updateQuantity(item.id, -getQuantityIncrement(product));
                          }}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        {editingQuantity === item.id ? (
                          <div className="flex items-center gap-1">
                             <Input
                               type="number"
                               className="w-20 h-6 text-xs text-center"
                               value={inputValue}
                               onChange={(e) => setInputValue(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') handleQuantitySubmit(item.id);
                                 if (e.key === 'Escape') handleQuantityCancel();
                               }}
                               onBlur={() => handleQuantitySubmit(item.id)}
                               placeholder="1.25"
                               step={(() => {
                                  const product = currentProductDetails.find(p => p.id === item.id) || products.find(p => p.id === item.id);
                                  return product ? getQuantityIncrement(product) : 0.001;
                                })()}
                                min={(() => {
                                  const product = currentProductDetails.find(p => p.id === item.id) || products.find(p => p.id === item.id);
                                  return product ? getMinimumQuantity(product) : 0.001;
                                })()}
                               autoFocus
                             />
                          </div>
                        ) : (
                          <div 
                            className="w-20 h-6 flex items-center justify-center text-xs font-medium cursor-pointer hover:bg-gray-100 rounded"
                            onClick={() => handleQuantityEdit(item.id, parseFloat(item.quantity))}
                          >
                            {formatQuantity(parseFloat(item.quantity))}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            const product = currentProductDetails.find(p => p.id === item.id) || products.find(p => p.id === item.id);
                            if (product) updateQuantity(item.id, getQuantityIncrement(product));
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="font-medium text-sm w-16 text-right">${((item.price || 0) * parseFloat(item.quantity || 0)).toFixed(2)}</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Product Search */}
          {showSearch && (
            <div className="space-y-4 border-t pt-4">
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
                <ProductStockFilter value={stockFilter} onChange={setStockFilter} />
              </div>

              {loading && <div className="text-center py-4">Loading products...</div>}

              {!loading && (
                <div className="text-sm text-gray-600 mb-2">
                  Showing {products.length} product{products.length !== 1 ? 's' : ''} {searchQuery && `for "${searchQuery}"`}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
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
                        <div className="font-semibold text-green-600">${(product.price || 0).toFixed(2)}</div>
                        <div className={`text-xs font-medium ${
                          product.stock_quantity > 10 
                            ? 'text-green-600' 
                            : product.stock_quantity > 0 
                            ? 'text-yellow-600' 
                            : product.stock_quantity === 0 
                            ? 'text-red-600' 
                            : 'text-orange-600'
                        }`}>
                          {product.stock_quantity > 0 
                            ? `Stock: ${formatQuantity(product.stock_quantity)}` 
                            : product.stock_quantity === 0 
                            ? 'Out of Stock' 
                            : `Backorder (${Math.abs(product.stock_quantity)})`
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {product.sku && (
                        <span className="text-xs text-gray-500">SKU: {product.sku}</span>
                      )}
                      
                      {getCartQuantity(product.id) > 0 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(product.id, -getQuantityIncrement(product))}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium">{formatQuantity(getCartQuantity(product.id))}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(product.id, getQuantityIncrement(product))}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" size="sm" onClick={() => addToCart(product)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
