
import { useState } from 'react';
import { CustomerAuthProvider } from '@/components/shop/CustomerAuthProvider';
import { CustomerAuthDropdown } from '@/components/shop/CustomerAuthDropdown';
import { ProductCatalog } from '@/components/shop/ProductCatalog';
import { ShoppingCart } from '@/components/shop/ShoppingCart';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart as CartIcon, Store } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category_id: string;
  stock_quantity: number;
  sku: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

function ShopPageContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/7af06903-3aa4-4e02-883b-f86692391965.png" 
                alt="Swift Dispatch Pro" 
                className="h-8 w-8 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Swift Dispatch Pro</h1>
                <p className="text-sm text-gray-600">Online Store</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <CartIcon className="w-6 h-6" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {totalItems}
                  </Badge>
                )}
              </button>
              <CustomerAuthDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Product Catalog */}
          <div className={`${showCart ? 'lg:col-span-2' : 'lg:col-span-4'} transition-all duration-300`}>
            <div className="flex items-center gap-2 mb-6">
              <Store className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Our Products</h2>
            </div>
            <ProductCatalog onCartUpdate={setCart} />
          </div>

          {/* Shopping Cart Sidebar */}
          {showCart && (
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <ShoppingCart cart={cart} onCartUpdate={setCart} />
              </div>
            </div>
          )}
        </div>

        {/* Cart Toggle for Mobile */}
        {totalItems > 0 && !showCart && (
          <div className="lg:hidden fixed bottom-4 right-4">
            <button
              onClick={() => setShowCart(true)}
              className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <CartIcon className="w-5 h-5" />
              <Badge className="bg-white text-blue-600">
                {totalItems}
              </Badge>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <CustomerAuthProvider>
      <ShopPageContent />
    </CustomerAuthProvider>
  );
}
