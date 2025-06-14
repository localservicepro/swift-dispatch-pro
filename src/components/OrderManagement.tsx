import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { Database } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  products: any;
  total_amount: number;
  status: OrderStatus;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
}

export function OrderManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders from database
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching orders from database...');
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_address,
          products,
          total_amount,
          status,
          driver_id,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_fee,
          subtotal,
          customers!orders_customer_id_fkey(suburb_id),
          profiles!orders_driver_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Fetched orders:', data);
      return data.map(order => ({
        ...order,
        suburb_id: order.customers?.suburb_id || null,
        driver_name: order.profiles?.full_name || 'Not Assigned'
      }));
    },
  });

  // Set up real-time subscription for order updates
  useEffect(() => {
    console.log('Setting up real-time subscription for orders...');
    
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Real-time order update received:', payload);
          
          // Invalidate and refetch orders when any change occurs
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Show toast notification for status updates
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            
            if (oldStatus !== newStatus) {
              toast({
                title: "Order Status Updated",
                description: `Order ${payload.new.order_number} changed from ${oldStatus} to ${newStatus}`,
              });
            }
          }
          
          // Show toast for new orders
          if (payload.eventType === 'INSERT' && payload.new) {
            toast({
              title: "New Order Created",
              description: `Order ${payload.new.order_number} has been created`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const handleOrderCreated = () => {
    // Refresh orders list from database
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
  };

  const handleOrderUpdated = () => {
    // Refresh orders list from database
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!",
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800";
      case "en_route": return "bg-blue-100 text-blue-800";
      case "loading": return "bg-orange-100 text-orange-800";
      case "preparing": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "en_route": return "En Route";
      case "delivered": return "Delivered";
      case "loading": return "Loading";
      case "preparing": return "Preparing";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const formatProducts = (products: any) => {
    if (!products) return 'No products';
    if (Array.isArray(products)) {
      return products.map(p => p.name || p).join(', ');
    }
    return 'Products listed';
  };

  if (error) {
    console.error('Orders query error:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
            <p className="text-slate-600 mt-1">Create and manage customer orders</p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Create New Order
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading orders. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-2">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
          <p className="text-slate-600 mt-1">Create and manage customer orders • Real-time updates enabled</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          Create New Order
        </Button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                >
                  Close
                </Button>
              </div>
              <MultiStepOrderForm
                onOrderCreated={handleOrderCreated}
                onClose={() => setIsCreating(false)}
              />
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <OrderEditDialog
          order={editingOrder}
          onOrderUpdated={handleOrderUpdated}
          onClose={() => setEditingOrder(null)}
        />
      )}

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Recent Orders {isLoading && <span className="text-sm font-normal text-slate-500">(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No orders found. Create your first order to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{order.order_number}</h3>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Customer</p>
                      <p className="font-medium">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-slate-400">{order.customer_phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500">Products</p>
                      <p className="font-medium">{formatProducts(order.products)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Driver</p>
                      <p className="font-medium">{order.driver_name || 'Not Assigned'}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    <p>Address: {order.customer_address}</p>
                    <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
                    {order.delivery_date && (
                      <p>Delivery: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingOrder(order)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
