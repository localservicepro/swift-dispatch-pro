
import { Badge } from "@/components/ui/badge";
import { PurchaseOrderDisplay } from "@/components/order/PurchaseOrderDisplay";
import { 
  CheckCircle,
  AlertCircle,
  XCircle,
  Truck,
  Clock,
  Package,
} from "lucide-react";

interface DeliveryCardHeaderProps {
  order: any;
}

export function DeliveryCardHeader({ order }: DeliveryCardHeaderProps) {
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <div className="font-semibold text-slate-800">
          {order.order_number}
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
          {order.status.replace('_', ' ').toUpperCase()}
        </div>
      </Badge>
    </div>
  );
}
