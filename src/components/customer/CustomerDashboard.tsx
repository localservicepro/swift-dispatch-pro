
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, User, LogOut, CreditCard } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_date: string;
}

export const CustomerDashboard = () => {
  const { signOut, profile } = useAuth();

  const { data: recentOrders, isLoading } = useQuery({
    queryKey: ['customer-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, delivery_date')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: customerInfo } = useQuery({
    queryKey: ['customer-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', profile?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await signOut();
  };

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
              <User className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">My Account</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/shop">
                <Button variant="ghost" size="sm">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {customerInfo?.first_name || profile?.full_name || 'Customer'}!
          </h2>
          <p className="text-gray-600">Manage your orders and account settings.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/shop">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Start Shopping</CardTitle>
                <ShoppingBag className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Browse Products</div>
                <p className="text-xs text-muted-foreground">
                  Explore our product catalog
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/customer/orders">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Orders</CardTitle>
                <Package className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentOrders?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total orders placed
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/customer/profile">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Settings</CardTitle>
                <User className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Account</div>
                <p className="text-xs text-muted-foreground">
                  Update your information
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Your most recent order activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-500">
                            Ordered on {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          {order.delivery_date && (
                            <p className="text-sm text-gray-500">
                              Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="font-medium">${order.total_amount.toFixed(2)}</span>
                      <Link to={`/customer/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link to="/customer/orders">
                    <Button variant="outline">View All Orders</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No orders yet</p>
                <Link to="/shop">
                  <Button>Start Shopping</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
