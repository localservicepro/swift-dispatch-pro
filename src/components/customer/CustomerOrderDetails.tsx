
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Calendar, MapPin, CreditCard } from "lucide-react";

interface OrderWithItems {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_date: string;
  delivery_time: string;
  customer_address: string;
  payment_status: string;
  payment_method: string;
  special_instructions: string;
  products: any;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
      description: string;
    };
  }[];
}

export const CustomerOrderDetails = () => {
  const { orderId } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['customer-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            products (
              name,
              description
            )
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      return data as OrderWithItems;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'en_route':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'loading':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
          <Link to="/customer/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
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
              <Link to="/customer/orders">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
              <Package className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{order.order_number}</CardTitle>
                <p className="text-gray-500">
                  Ordered on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${order.total_amount.toFixed(2)}</p>
                <div className="flex space-x-2 mt-2">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getPaymentStatusColor(order.payment_status || 'pending')}>
                    {(order.payment_status || 'pending').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Address</h4>
                <p className="text-gray-600">{order.customer_address}</p>
              </div>
              {order.delivery_date && (
                <div>
                  <h4 className="font-medium">Delivery Date & Time</h4>
                  <p className="text-gray-600">
                    {new Date(order.delivery_date).toLocaleDateString()}
                    {order.delivery_time && ` at ${order.delivery_time}`}
                  </p>
                </div>
              )}
              {order.special_instructions && (
                <div>
                  <h4 className="font-medium">Special Instructions</h4>
                  <p className="text-gray-600">{order.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Payment Status</h4>
                <Badge className={getPaymentStatusColor(order.payment_status || 'pending')}>
                  {(order.payment_status || 'pending').toUpperCase()}
                </Badge>
              </div>
              {order.payment_method && (
                <div>
                  <h4 className="font-medium">Payment Method</h4>
                  <p className="text-gray-600">{order.payment_method}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium">Total Amount</h4>
                <p className="text-xl font-bold">${order.total_amount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.products.name}</h4>
                    <p className="text-sm text-gray-500">{item.products.description}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.total_price.toFixed(2)}</p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-4">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
