import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Minus, ShoppingCart, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  images: string[];
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

export interface StorefrontCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

interface StorefrontProductBrowserProps {
  cart: StorefrontCartItem[];
  onCartChange: (cart: StorefrontCartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StorefrontProductBrowser({ cart, onCartChange, onNext, onBack }: StorefrontProductBrowserProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("id, name, description, price, stock_quantity, sku, images, category_id").eq("is_active", true).order("name"),
        supabase.from("product_categories").select("id, name").eq("is_active", true).order("name"),
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const getCartQty = (productId: string) => cart.find((i) => i.id === productId)?.quantity || 0;

  const updateCart = (product: Product, delta: number) => {
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        onCartChange(cart.filter((i) => i.id !== product.id));
      } else {
        onCartChange(cart.map((i) => (i.id === product.id ? { ...i, quantity: newQty } : i)));
      }
    } else if (delta > 0) {
      onCartChange([...cart, { id: product.id, name: product.name, price: product.price, quantity: 1, unit: "each" }]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-10 w-10 mb-2" />
            <p>No products found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
            const qty = getCartQty(product.id);
            return (
              <Card key={product.id} className={qty > 0 ? "ring-2 ring-primary/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                    </div>
                    <span className="font-semibold text-sm ml-2">${product.price.toFixed(2)}</span>
                  </div>
                  {product.stock_quantity <= 0 && (
                    <Badge variant="destructive" className="text-xs mb-2">Out of stock</Badge>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCart(product, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium text-sm w-8 text-center">{qty}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateCart(product, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => updateCart(product, 1)} disabled={product.stock_quantity <= 0}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart summary bar */}
      {cart.length > 0 && (
        <Card className="sticky bottom-4 bg-primary text-primary-foreground">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
              <span className="text-primary-foreground/80">·</span>
              <span className="font-semibold">${cartTotal.toFixed(2)}</span>
            </div>
            <Button variant="secondary" onClick={onNext}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={cart.length === 0}>
          Next
        </Button>
      </div>
    </div>
  );
}
