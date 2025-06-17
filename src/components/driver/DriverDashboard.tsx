
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderDetailsCard } from "./OrderDetailsCard";
import { DeliveryActionDialog } from "./DeliveryActionDialog";
import { updateOrderStatus } from "@/utils/orderStatusService";
import { Package, MapPin, Clock, User, Truck, CheckCircle } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string | null;
  total_amount: number;
  delivery_date: string | null;
  delivery_time: string | null;
  status: OrderStatus;
  special_instructions: string | null;
  products: any;
  truck_type: string | null;
}

interface DriverDashboardProps {
  user: any;
  profile: any;
  onLogout: () => Promise<void>;
}

export function DriverDashboard({ user, profile, onLogout }: DriverDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current driver ID
  useEffect(() => {
    const getCurrentDriver = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentDriverId(user.id);
      }
    };
    getCurrentDriver();
  }, []);

  // Fetch orders assigned to current driver
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['driver-orders', currentDriverId],
    queryFn: async () => {
      if (!currentDriverId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', currentDriverId)
        .in('status', ['preparing', 'ready', 'dispatched', 'in_transit', 'delivered'])
        .order('delivery_date', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      // Transform the data to match our Order interface
      return (data || []).map(order => ({
        ...order,
        products: Array.isArray(order.products) ? order.products : []
      })) as Order[];
    },
    enabled: !!currentDriverId,
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, notes?: string) => {
    try {
      await updateOrderStatus(orderId, newStatus, currentDriverId || undefined, notes);
      
      // Refresh orders
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      
      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}`,
      });
      
      setIsActionDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'dispatched': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: string): OrderStatus | null => {
    switch (currentStatus) {
      case 'preparing': return 'ready';
      case 'ready': return 'dispatched';  
      case 'dispatched': return 'in_transit';
      case 'in_transit': return 'delivered';
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Driver Dashboard</h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {orders.length} Active Orders
          </Badge>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Orders Assigned</h3>
            <p className="text-slate-500">You don't have any orders assigned at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Order #{order.order_number}
                  </CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-800">{order.customer_name}</p>
                      <p className="text-sm text-slate-600">{order.customer_phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    <p className="text-sm text-slate-600">{order.customer_address}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD'}
                      </p>
                      <p className="text-sm text-slate-600">{order.delivery_time || 'No time specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-slate-500" />
                    <p className="text-sm text-slate-600 capitalize">{order.truck_type || 'No truck assigned'}</p>
                  </div>
                </div>

                {order.special_instructions && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Special Instructions:</p>
                    <p className="text-sm text-blue-700">{order.special_instructions}</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-800">
                      ${order.total_amount.toFixed(2)}
                    </span>
                    <span className="text-sm text-slate-600">
                      ({Array.isArray(order.products) ? order.products.length : 0} items)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details
                    </Button>
                    {getNextStatus(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsActionDialogOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Update Status
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrder && !isActionDialogOpen && (
        <OrderDetailsCard order={selectedOrder} />
      )}

      {selectedOrder && isActionDialogOpen && (
        <DeliveryActionDialog
          isOpen={isActionDialogOpen}
          onClose={() => setIsActionDialogOpen(false)}
          order={selectedOrder}
          onStatusUpdate={(newStatus, notes) => 
            handleStatusUpdate(selectedOrder.id, newStatus, notes)
          }
        />
      )}
    </div>
  );
}
