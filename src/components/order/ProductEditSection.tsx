
import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, Plus, Minus, X } from "lucide-react";

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
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();

  // Calculate subtotal from current products
  const subtotal = useMemo(() => {
    return currentProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
    }

    if (selectedCategory && selectedCategory !== "all") {
      query = query.eq('category_id', selectedCategory);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      const productsWithImages = data.map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      }));
      setProducts(productsWithImages);
    }
    setLoading(false);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (showSearch) {
      loadCategories();
      loadProducts();
    }
  }, [showSearch, loadCategories, loadProducts]);

  const addToCart = useCallback((product: Product) => {
    const existingItemIndex = currentProducts.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      const updatedProducts = [...currentProducts];
      updatedProducts[existingItemIndex] = {
        ...updatedProducts[existingItemIndex],
        quantity: updatedProducts[existingItemIndex].quantity + 1
      };
      onProductsChange(updatedProducts);
    } else {
      const newItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      };
      onProductsChange([...currentProducts, newItem]);
    }
  }, [currentProducts, onProductsChange]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      const updatedProducts = currentProducts.filter(item => item.id !== productId);
      onProductsChange(updatedProducts);
      return;
    }

    const updatedProducts = currentProducts.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    );
    onProductsChange(updatedProducts);
  }, [currentProducts, onProductsChange]);

  const removeFromCart = useCallback((productId: string) => {
    const updatedProducts = currentProducts.filter(item => item.id !== productId);
    onProductsChange(updatedProducts);
  }, [currentProducts, onProductsChange]);

  const getCartQuantity = useCallback((productId: string) => {
    const item = currentProducts.find(item => item.id === productId);
    return item ? item.quantity : 0;
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
                      <div className="text-xs text-gray-500">${item.price.toFixed(2)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="font-medium text-sm w-16 text-right">${(item.price * item.quantity).toFixed(2)}</div>
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
              </div>

              {loading && <div className="text-center py-4">Loading products...</div>}

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
                        <div className="font-semibold text-green-600">${product.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Stock: {product.stock_quantity}</div>
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
                            onClick={() => updateQuantity(product.id, getCartQuantity(product.id) - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-medium">{getCartQuantity(product.id)}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(product.id, getCartQuantity(product.id) + 1)}
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
