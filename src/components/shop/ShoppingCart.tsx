
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCustomerAuth } from './CustomerAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart as CartIcon, Trash2 } from 'lucide-react';

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

interface ShoppingCartProps {
  cart: CartItem[];
  onCartUpdate: (cart: CartItem[]) => void;
}

export function ShoppingCart({ cart, onCartUpdate }: ShoppingCartProps) {
  const { user, profile } = useCustomerAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: profile ? `${profile.first_name} ${profile.last_name}` : '',
    customerPhone: '',
    customerAddress: '',
    deliveryAddress: '',
    specialInstructions: '',
    deliveryDate: '',
    deliveryTime: ''
  });

  const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    onCartUpdate(newCart);
    toast({
      title: 'Removed from cart',
      description: 'Item removed from cart'
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }
    
    const newCart = cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    onCartUpdate(newCart);
  };

  const generateOrderNumber = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create customer if not logged in
      let customerId = profile?.id;
      
      if (!user && orderForm.customerName && orderForm.customerPhone) {
        // Check if customer exists by phone or create new one
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', orderForm.customerPhone)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              first_name: orderForm.customerName.split(' ')[0] || orderForm.customerName,
              last_name: orderForm.customerName.split(' ').slice(1).join(' ') || '',
              email: `guest-${Date.now()}@example.com`,
              phone: orderForm.customerPhone,
              full_address: orderForm.customerAddress,
              customer_type: 'account'
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Create order
      const orderData = {
        order_number: generateOrderNumber(),
        customer_id: customerId,
        customer_name: orderForm.customerName,
        customer_phone: orderForm.customerPhone,
        customer_address: orderForm.customerAddress,
        delivery_address: orderForm.deliveryAddress || orderForm.customerAddress,
        special_instructions: orderForm.specialInstructions,
        delivery_date: orderForm.deliveryDate || null,
        delivery_time: orderForm.deliveryTime || null,
        products: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: item.product.price * item.quantity
        })),
        subtotal: totalAmount,
        total_amount: totalAmount,
        status: 'preparing',
        payment_status: 'pending'
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) throw orderError;

      toast({
        title: 'Order Placed Successfully!',
        description: `Your order ${orderData.order_number} has been placed. You will receive a confirmation email shortly.`
      });

      // Clear cart and form
      onCartUpdate([]);
      setOrderForm({
        customerName: profile ? `${profile.first_name} ${profile.last_name}` : '',
        customerPhone: '',
        customerAddress: '',
        deliveryAddress: '',
        specialInstructions: '',
        deliveryDate: '',
        deliveryTime: ''
      });

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CartIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-500">Add some products to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CartIcon className="w-5 h-5" />
            Shopping Cart ({cart.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{item.product.name}</h4>
                <p className="text-sm text-gray-600">${item.product.price.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Badge variant="secondary">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromCart(item.product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total: ${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div>
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={orderForm.customerName}
                onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                required
                disabled={!!profile}
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={orderForm.customerPhone}
                onChange={(e) => setOrderForm({...orderForm, customerPhone: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerAddress">Billing Address *</Label>
              <Textarea
                id="customerAddress"
                value={orderForm.customerAddress}
                onChange={(e) => setOrderForm({...orderForm, customerAddress: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="deliveryAddress">Delivery Address (leave blank if same as billing)</Label>
              <Textarea
                id="deliveryAddress"
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm({...orderForm, deliveryAddress: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryDate">Preferred Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={orderForm.deliveryDate}
                  onChange={(e) => setOrderForm({...orderForm, deliveryDate: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="deliveryTime">Preferred Delivery Time</Label>
                <Input
                  id="deliveryTime"
                  type="time"
                  value={orderForm.deliveryTime}
                  onChange={(e) => setOrderForm({...orderForm, deliveryTime: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({...orderForm, specialInstructions: e.target.value})}
                placeholder="Any special delivery instructions..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Placing Order...' : `Place Order - $${totalAmount.toFixed(2)}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
