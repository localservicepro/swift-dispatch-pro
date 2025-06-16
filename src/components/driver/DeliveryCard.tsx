
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DeliveryActionDialog } from "./DeliveryActionDialog";
import { Database } from "@/integrations/supabase/types";
import { 
  MapPin, 
  Phone, 
  Package, 
  DollarSign, 
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface DeliveryCardProps {
  order: any;
  onStatusUpdate: () => void;
}

export function DeliveryCard({ order, onStatusUpdate }: DeliveryCardProps) {
  const [updating, setUpdating] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "delivered" | "cancelled" | null;
  }>({
    open: false,
    action: null
  });
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'loading': return 'bg-blue-100 text-blue-800';
      case 'en_route': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'loading': return <Clock className="w-4 h-4" />;
      case 'en_route': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: string): OrderStatus | null => {
    switch (currentStatus) {
      case 'preparing': return 'loading';
      case 'loading': return 'en_route';
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'preparing': return 'Start Loading';
      case 'loading': return 'Start Delivery';
      default: return null;
    }
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase.rpc('update_order_status', {
        order_id: order.id,
        new_status: newStatus
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus.replace('_', ' ')}`,
      });

      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openActionDialog = (action: "delivered" | "cancelled") => {
    setActionDialog({ open: true, action });
  };

  const closeActionDialog = () => {
    setActionDialog({ open: false, action: null });
  };

  const products = Array.isArray(order.products) ? order.products : [];
  const nextStatus = getNextStatus(order.status);
  const statusLabel = getStatusLabel(order.status);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-800">
              {order.order_number}
            </div>
            <Badge className={getStatusColor(order.status)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {order.status.replace('_', ' ').toUpperCase()}
              </div>
            </Badge>
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-500" />
              <div>
                <div className="font-medium">{order.customer_name}</div>
                <div className="text-sm text-slate-600">{order.customer_address}</div>
              </div>
            </div>
            
            {order.customer_phone && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-500" />
                <a 
                  href={`tel:${order.customer_phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {order.customer_phone}
                </a>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Items:</span>
            </div>
            <div className="text-sm text-slate-600 pl-6">
              {products.map((product: any, index: number) => (
                <div key={index}>
                  {typeof product === 'string' ? product : product.name || 'Item'}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center gap-2 text-slate-700">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-green-600">
              ${order.total_amount.toFixed(2)}
            </span>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm font-medium text-yellow-800 mb-1">
                Special Instructions:
              </div>
              <div className="text-sm text-yellow-700">
                {order.special_instructions}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Regular status progression button */}
            {nextStatus && statusLabel && (
              <Button
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                className="w-full"
                variant="outline"
              >
                {updating ? 'Updating...' : statusLabel}
              </Button>
            )}

            {/* Delivery completion buttons (only show when en_route) */}
            {order.status === 'en_route' && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => openActionDialog('delivered')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Delivered
                </Button>
                <Button
                  onClick={() => openActionDialog('cancelled')}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <DeliveryActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && closeActionDialog()}
        order={order}
        action={actionDialog.action!}
        onStatusUpdate={onStatusUpdate}
      />
    </>
  );
}
