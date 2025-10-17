import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { DeliveryCard } from "./DeliveryCard";
import { NotificationSettings } from "./NotificationSettings";
import { Truck, Package, Clock, CheckCircle, LogOut, User, Loader2, Settings } from "lucide-react";
import { emailService } from "@/utils/emailService";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { browserNotificationService } from "@/utils/browserNotificationService";

interface DriverDashboardProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

export function DriverDashboard({ user, profile, onLogout }: DriverDashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();
  const { signOut, signingOut } = useAuth();
  const { canNotify } = useNotificationPermission();

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
        async (payload) => {
          console.log('Real-time driver order update received:', payload);
          fetchOrders();
          
          // Show toast notification for order assignments and status changes
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const wasAssigned = !payload.old.driver_id && payload.new.driver_id === user.id;
            const statusChanged = payload.old.status !== payload.new.status;
            
            if (wasAssigned) {
              toast({
                title: "New Order Assigned",
                description: `Order ${payload.new.order_number} has been assigned to you`,
              });
              
              // Send browser notification for new assignment
              if (canNotify) {
                browserNotificationService.sendOrderAssignmentNotification({
                  orderId: payload.new.id,
                  orderNumber: payload.new.order_number,
                  customerName: payload.new.customer_name,
                  deliveryDate: payload.new.delivery_date,
                  deliveryTime: payload.new.delivery_time,
                });
              }
            } else if (statusChanged) {
              toast({
                title: "Order Status Updated",
                description: `Order ${payload.new.order_number} status changed to ${payload.new.status}`,
              });
              
              // Send browser notification for status update
              if (canNotify) {
                browserNotificationService.sendStatusUpdateNotification({
                  orderId: payload.new.id,
                  orderNumber: payload.new.order_number,
                  customerName: payload.new.customer_name,
                  status: payload.new.status,
                });
              }

              // Send email notification to customer when driver updates status
              try {
                await emailService.sendOrderStatusUpdate(
                  payload.new.id,
                  payload.old.status,
                  payload.new.status,
                  profile?.full_name
                );
              } catch (error) {
                console.error('Failed to send status update email:', error);
                // Don't show error toast to driver as email is background process
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up driver real-time subscription...');
      subscription.unsubscribe();
    };
  }, [user.id, toast, profile?.full_name]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          trucks!orders_truck_id_fkey (
            registration_number
          ),
          customers!orders_customer_id_fkey (
            customer_type,
            company_name,
            business_name
          )
        `)
        .eq('driver_id', user.id)
        .in('status', ['preparing', 'loading', 'en_route'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to include truck_registration for compatibility
      const transformedData = data?.map(order => ({
        ...order,
        truck_registration: order.trucks?.registration_number || null
      })) || [];
      
      setOrders(transformedData);
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

  const handleSignOut = async () => {
    const { error } = await signOut();
    
    if (error) {
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    } else {
      // Call the onLogout callback to update parent component state
      onLogout();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-600"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-slate-600"
            >
              {signingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Notification Settings */}
        {showSettings && (
          <NotificationSettings />
        )}
        
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
