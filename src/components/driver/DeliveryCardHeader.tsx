
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderDisplay } from "@/components/order/PurchaseOrderDisplay";
import { 
  CheckCircle,
  AlertCircle,
  XCircle,
  Truck,
  Clock,
  Package,
  MapPin,
  ArrowRightLeft,
} from "lucide-react";

interface DeliveryCardHeaderProps {
  order: any;
}

export function DeliveryCardHeader({ order }: DeliveryCardHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pickup_scheduled': return 'bg-purple-100 text-purple-800';
      case 'pickup_in_progress': return 'bg-purple-200 text-purple-800';
      case 'pickup_complete': return 'bg-indigo-100 text-indigo-800';
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
      case 'pickup_scheduled': return <MapPin className="w-4 h-4" />;
      case 'pickup_in_progress': return <Package className="w-4 h-4" />;
      case 'pickup_complete': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'loading': return <Clock className="w-4 h-4" />;
      case 'en_route': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pickup_scheduled': return 'PICKUP SCHEDULED';
      case 'pickup_in_progress': return 'PICKUP IN PROGRESS';
      case 'pickup_complete': return 'PICKUP COMPLETE';
      case 'preparing': return 'PREPARING';
      case 'loading': return 'LOADING';
      case 'en_route': return 'EN ROUTE';
      case 'delivered': return 'DELIVERED';
      case 'cancelled': return 'CANCELLED';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-800">
            {order.order_number}
          </div>
          {order.delivery_method === 'pickup_delivery' && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              <ArrowRightLeft className="w-3 h-3 mr-1" />
              P&D
            </Badge>
          )}
        </div>
        <PurchaseOrderDisplay 
          purchaseOrder={order.purchase_order}
          className="mt-1"
          variant="secondary"
        />
      </div>
      <Badge className={getStatusColor(order.status)}>
        <div className="flex items-center gap-1">
          {getStatusIcon(order.status)}
          {getStatusLabel(order.status)}
        </div>
      </Badge>
    </div>
  );
}
