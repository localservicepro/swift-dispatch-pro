
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Truck, Calendar, MapPin, Package } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'super_admin' | 'admin' | 'driver' | 'customer' | 'account_customer';
  created_at: string;
}

interface ViewDeliveriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Profile | null;
}

export function ViewDeliveriesDialog({ open, onOpenChange, driver }: ViewDeliveriesDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && driver) {
      fetchDriverOrders();
    }
  }, [open, driver]);

  const fetchDriverOrders = async () => {
    if (!driver) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching driver orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Deliveries - {driver?.full_name || 'Driver'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading deliveries...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Deliveries Found</h3>
              <p className="text-gray-500">
                This driver hasn't been assigned any deliveries yet.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">#{order.order_number}</h3>
                      <Badge className={getStatusColor(order.status)}>
                        {formatStatus(order.status)}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      ${order.total_amount}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-medium">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-medium">{order.customer_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  {order.delivery_address && (
                    <div className="mt-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm">
                        <strong>Delivery:</strong> {order.delivery_address}
                      </p>
                    </div>
                  )}
                  
                  {order.special_instructions && (
                    <div className="mt-2 p-2 bg-blue-50 border-l-2 border-blue-200">
                      <p className="text-sm">
                        <strong>Instructions:</strong> {order.special_instructions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
