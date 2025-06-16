import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Package, Navigation, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhotoUpload } from "./PhotoUpload";
import { DeliveryMapView } from "./DeliveryMapView";

interface DeliveryCardProps {
  order: any;
  onStatusUpdate: () => void;
}

export function DeliveryCard({ order, onStatusUpdate }: DeliveryCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const { toast } = useToast();

  const updateOrderStatus = async (newStatus: "preparing" | "loading" | "en_route" | "delivered" | "cancelled") => {
    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order ${order.order_number} marked as ${newStatus.replace('_', ' ')}`,
      });

      onStatusUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'loading': return 'bg-orange-100 text-orange-800';
      case 'en_route': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'preparing': return 'secondary';
      case 'loading': return 'default';
      case 'en_route': return 'secondary';
      case 'delivered': return 'default';
      default: return 'outline';
    }
  };

  const formatProducts = (products: any) => {
    if (!products) return 'No products';
    if (Array.isArray(products)) {
      return products.map(p => p.name || p).join(', ');
    }
    return 'Products listed';
  };

  if (showMapView) {
    return (
      <DeliveryMapView
        order={order}
        onBack={() => setShowMapView(false)}
        onStatusUpdate={onStatusUpdate}
      />
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              {order.order_number}
            </CardTitle>
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4" />
              <div>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-sm text-slate-600">{order.customer_address}</p>
                {order.customer_phone && (
                  <p className="text-xs text-slate-500">{order.customer_phone}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600">
              <Package className="w-4 h-4" />
              <span className="text-sm">{formatProducts(order.products)}</span>
            </div>
            
            {(order.delivery_date || order.delivery_time) && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {order.delivery_date && new Date(order.delivery_date).toLocaleDateString()}
                  {order.delivery_time && ` at ${order.delivery_time}`}
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-xl font-bold text-green-600">
              ${order.total_amount.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {/* Navigation Button */}
            <Button 
              onClick={() => setShowMapView(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Navigate to Delivery
            </Button>

            {/* Status Update Buttons */}
            <div className="flex gap-2">
              {order.status === 'preparing' && (
                <Button 
                  size="sm" 
                  onClick={() => updateOrderStatus('loading')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Mark Loading
                </Button>
              )}
              
              {order.status === 'loading' && (
                <Button 
                  size="sm" 
                  onClick={() => updateOrderStatus('en_route')}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Start Delivery
                </Button>
              )}
              
              {order.status === 'en_route' && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowPhotoUpload(true)}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Photo
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => updateOrderStatus('delivered')}
                    disabled={isUpdating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Complete
                  </Button>
                </>
              )}
            </div>
          </div>

          {order.special_instructions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Special Instructions:</strong> {order.special_instructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showPhotoUpload && (
        <PhotoUpload
          orderId={order.id}
          onPhotoUploaded={() => {
            setShowPhotoUpload(false);
            toast({
              title: "Photo Uploaded",
              description: "Delivery photo has been uploaded successfully.",
            });
          }}
          onCancel={() => setShowPhotoUpload(false)}
        />
      )}
    </>
  );
}
