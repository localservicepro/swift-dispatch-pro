
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, User, LogOut, Package } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  product_categories?: {
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

const Shop = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const { signOut, profile } = useAuth();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Shop</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/customer">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  My Account
                </Button>
              </Link>
              <div className="relative">
                <Button variant="outline" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart ({cartItemCount})
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </div>
              <span className="text-sm text-gray-600">{profile?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Products */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant="secondary">
                        ${product.price.toFixed(2)}
                      </Badge>
                    </div>
                    {product.product_categories && (
                      <Badge variant="outline" className="w-fit">
                        {product.product_categories.name}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {product.description}
                    </CardDescription>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Stock: {product.stock_quantity}
                      </span>
                      <Button
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity === 0}
                        size="sm"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Shopping Cart</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-4">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.product.name}</h4>
                            <p className="text-xs text-gray-500">
                              ${item.product.price.toFixed(2)} each
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="text-sm">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ${(item.product.price * item.quantity).toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full mt-4" disabled={cart.length === 0}>
                        Proceed to Checkout
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
