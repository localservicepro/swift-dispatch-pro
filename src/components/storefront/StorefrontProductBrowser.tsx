import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Minus, ShoppingCart, Package, ArrowRight, X, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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
}

export function StorefrontProductBrowser({ cart, onCartChange, onNext }: StorefrontProductBrowserProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);

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
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

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

  const removeFromCart = (itemId: string) => {
    onCartChange(cart.filter((i) => i.id !== itemId));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 sm:p-8">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Fresh Products, Delivered
          </h2>
          <p className="mt-2 text-muted-foreground">
            Browse our catalog, add items to your cart, and checkout when you're ready.
          </p>
        </div>
      </div>

      {/* Search & Category Chips */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-background border-border/60 shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === c.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="h-8 w-8" />
          </div>
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const qty = getCartQty(product.id);
            const isOutOfStock = product.stock_quantity <= 0;
            return (
              <Card
                key={product.id}
                className={`group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                  qty > 0 ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
                } ${isOutOfStock ? "opacity-60" : ""}`}
              >
                {/* Product Image Placeholder */}
                <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
                  )}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow">
                      {qty} in cart
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Badge variant="destructive">Out of stock</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                    <span className="font-bold text-base text-primary whitespace-nowrap">${product.price.toFixed(2)}</span>
                  </div>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground mb-3">SKU: {product.sku}</p>
                  )}
                  {!product.sku && <div className="mb-3" />}
                  
                  {qty > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-full"
                        onClick={() => updateCart(product, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-semibold text-base w-10 text-center">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 rounded-full"
                        onClick={() => updateCart(product, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-xl"
                      variant="outline"
                      onClick={() => updateCart(product, 1)}
                      disabled={isOutOfStock}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add to Cart
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Cart Button & Drawer */}
      {cart.length > 0 && (
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-primary text-primary-foreground pl-5 pr-6 py-3.5 rounded-full shadow-2xl hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="font-semibold">${cartTotal.toFixed(2)}</span>
            </button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Your Cart ({cartCount} items)
              </SheetTitle>
            </SheetHeader>
            <Separator />
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-full"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeFromCart(item.id);
                          } else {
                            onCartChange(cart.map((c) => c.id === item.id ? { ...c, quantity: c.quantity - 1 } : c));
                          }
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-full"
                        onClick={() => onCartChange(cart.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-sm shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="pt-4 space-y-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold"
                onClick={() => {
                  setCartOpen(false);
                  onNext();
                }}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
