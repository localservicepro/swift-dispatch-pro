import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, LogOut } from "lucide-react";
import { CustomerOrderCreate } from "./CustomerOrderCreate";
import { formatDistanceToNow } from "date-fns";

export function CustomerPortalDashboard() {
  const { signOut, user } = useAuth();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Fetch customer info
  const { data: customer } = useQuery({
    queryKey: ['customer-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch customer orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['customer-orders', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      preparing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      loading: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      en_route: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {customer?.company_name || customer?.business_name || `${customer?.first_name} ${customer?.last_name}`}
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">My Orders</h2>
          <Button onClick={() => setIsCreatingOrder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Order
          </Button>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPaymentStatusColor(order.payment_status || 'pending')}>
                        {(order.payment_status || 'pending').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                      <p className="text-sm text-foreground">{order.delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                      <p className="text-sm text-foreground">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Not scheduled'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold text-foreground">${order.total_amount?.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Products */}
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      <Package className="h-4 w-4 inline mr-1" />
                      Products
                    </p>
                    <div className="text-sm text-foreground">
                      {order.products_formatted || 'No products listed'}
                    </div>
                  </div>

                  {order.order_notes && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm text-foreground">{order.order_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first order to get started
              </p>
              <Button onClick={() => setIsCreatingOrder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Order
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Order Creation Dialog */}
      {isCreatingOrder && customer && (
        <CustomerOrderCreate
          customer={customer}
          onClose={() => setIsCreatingOrder(false)}
          onSuccess={() => {
            setIsCreatingOrder(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
