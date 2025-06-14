import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DeliveryCard } from "./DeliveryCard";
import { Truck, Package, Clock, CheckCircle, LogOut, User } from "lucide-react";

interface DriverDashboardProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

export function DriverDashboard({ user, profile, onLogout }: DriverDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time updates for driver-specific orders
    console.log('Setting up real-time subscription for driver orders...');
    const subscription = supabase
      .channel('driver-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `driver_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Real-time driver order update received:', payload);
          fetchOrders();
          
          // Show toast notification for order assignments
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const wasAssigned = !payload.old.driver_id && payload.new.driver_id === user.id;
            const statusChanged = payload.old.status !== payload.new.status;
            
            if (wasAssigned) {
              toast({
                title: "New Order Assigned",
                description: `Order ${payload.new.order_number} has been assigned to you`,
              });
            } else if (statusChanged) {
              toast({
                title: "Order Status Updated",
                description: `Order ${payload.new.order_number} status changed to ${payload.new.status}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up driver real-time subscription...');
      subscription.unsubscribe();
    };
  }, [user.id, toast]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['preparing', 'loading', 'en_route'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const loading = orders.filter(o => o.status === 'loading').length;
    const enRoute = orders.filter(o => o.status === 'en_route').length;
    
    return { preparing, loading, enRoute, total: orders.length };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800">
                {profile.full_name || 'Driver'}
              </h1>
              <p className="text-sm text-slate-600">Active Deliveries • Real-time</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-slate-600"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="text-center p-3">
            <Package className="w-6 h-6 mx-auto text-orange-600 mb-1" />
            <div className="text-lg font-bold text-orange-600">{stats.preparing}</div>
            <div className="text-xs text-slate-600">Preparing</div>
          </Card>
          
          <Card className="text-center p-3">
            <Clock className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <div className="text-lg font-bold text-blue-600">{stats.loading}</div>
            <div className="text-xs text-slate-600">Loading</div>
          </Card>
          
          <Card className="text-center p-3">
            <Truck className="w-6 h-6 mx-auto text-purple-600 mb-1" />
            <div className="text-lg font-bold text-purple-600">{stats.enRoute}</div>
            <div className="text-xs text-slate-600">En Route</div>
          </Card>
          
          <Card className="text-center p-3">
            <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <div className="text-lg font-bold text-green-600">{stats.total}</div>
            <div className="text-xs text-slate-600">Total</div>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                No Active Deliveries
              </h3>
              <p className="text-slate-600">
                You don't have any assigned deliveries at the moment.
              </p>
            </Card>
          ) : (
            orders.map((order) => (
              <DeliveryCard 
                key={order.id} 
                order={order} 
                onStatusUpdate={fetchOrders}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
