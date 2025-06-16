
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, Clock, Navigation, RefreshCw } from "lucide-react";

interface ActiveDelivery {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address: string;
  status: string;
  driver_name: string;
  last_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  estimated_duration?: number;
  estimated_distance?: number;
}

export function FleetTrackingDashboard() {
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveDeliveries();

    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('fleet-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: 'status=in.(loading,en_route)'
        }, 
        () => {
          console.log('Active delivery updated');
          loadActiveDeliveries();
        }
      )
      .subscribe();

    const locationsChannel = supabase
      .channel('fleet-locations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'driver_locations'
        }, 
        () => {
          console.log('Driver location updated');
          loadActiveDeliveries();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActiveDeliveries, 30000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(locationsChannel);
      clearInterval(interval);
    };
  }, []);

  const loadActiveDeliveries = async () => {
    try {
      setLoading(true);

      // Get active orders with driver information
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_address,
          status,
          driver_id,
          profiles!orders_driver_id_fkey(full_name)
        `)
        .in('status', ['loading', 'en_route'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get latest locations for each driver
      const deliveries: ActiveDelivery[] = [];
      
      for (const order of orders || []) {
        if (!order.driver_id) continue;

        // Get latest location for this driver
        const { data: location } = await supabase
          .from('driver_locations')
          .select('latitude, longitude, timestamp')
          .eq('driver_id', order.driver_id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        // Get route information
        const { data: route } = await supabase
          .from('delivery_routes')
          .select('estimated_duration, estimated_distance')
          .eq('order_id', order.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        deliveries.push({
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_address: order.customer_address,
          status: order.status,
          driver_name: order.profiles?.full_name || 'Unknown Driver',
          last_location: location || undefined,
          estimated_duration: route?.estimated_duration,
          estimated_distance: route?.estimated_distance,
        });
      }

      setActiveDeliveries(deliveries);
    } catch (error: any) {
      console.error('Failed to load active deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load active deliveries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading': return 'bg-orange-100 text-orange-800';
      case 'en_route': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'Unknown';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const getTimeSinceLastUpdate = (timestamp?: string) => {
    if (!timestamp) return 'No location data';
    
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading fleet data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Fleet Tracking</h2>
          <p className="text-slate-600 mt-1">Real-time delivery monitoring and driver locations</p>
        </div>
        <Button onClick={loadActiveDeliveries} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Fleet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Deliveries</p>
                <p className="text-2xl font-bold text-slate-800">{activeDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Loading</p>
                <p className="text-2xl font-bold text-slate-800">
                  {activeDeliveries.filter(d => d.status === 'loading').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Navigation className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">En Route</p>
                <p className="text-2xl font-bold text-slate-800">
                  {activeDeliveries.filter(d => d.status === 'en_route').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Deliveries List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No active deliveries at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map((delivery) => (
                <div key={delivery.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-800">{delivery.order_number}</h3>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-700">{delivery.customer_name}</p>
                      <p className="text-sm text-slate-600">{delivery.customer_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-700">{delivery.driver_name}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {getTimeSinceLastUpdate(delivery.last_location?.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* Route Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>ETA: {formatDuration(delivery.estimated_duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-green-600" />
                      <span>Distance: {formatDistance(delivery.estimated_distance)}</span>
                    </div>
                  </div>

                  {/* Location Status */}
                  {delivery.last_location && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-blue-800">
                          Last seen: {delivery.last_location.latitude.toFixed(6)}, {delivery.last_location.longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
