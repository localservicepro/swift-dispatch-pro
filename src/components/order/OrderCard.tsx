
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, FileText } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { getTruckInfo } from "@/utils/truckUtils";
import { OrderStatusButtons } from "./OrderStatusButtons";

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
  suburb_name?: string;
  suburb_state?: string;
  suburb_postcode?: string;
  driver_name?: string;
  truck_registration?: string;
  truck_type_from_truck?: string;
  truck_type?: string;
}

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, currentOrder: Order) => void;
}

export function OrderCard({ order, onEdit, onStatusUpdate }: OrderCardProps) {
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
      return products.map(p => {
        const name = p.name || p.product_name || 'Product';
        const quantity = p.quantity || 1;
        return `${name} (Qty: ${quantity})`;
      }).join(', ');
    }
    return 'Products listed';
  };

  const truckInfo = getTruckInfo(order.truck_type_from_truck || order.truck_type);

  return (
    <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
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
        <div>
          <p className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Suburb
          </p>
          <p className="font-medium">
            {order.suburb_name ? 
              `${order.suburb_name}, ${order.suburb_state}${order.suburb_postcode ? ` (${order.suburb_postcode})` : ''}` : 
              'Not specified'
            }
          </p>
        </div>
      </div>

      {/* Truck Information */}
      {(order.truck_type || order.truck_registration) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-slate-500 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Truck Type
            </p>
            <div className="flex items-center gap-2">
              {truckInfo && (
                <>
                  <truckInfo.icon className={`w-4 h-4 ${truckInfo.colorClass}`} />
                  <span className="font-medium">{truckInfo.label}</span>
                </>
              )}
            </div>
          </div>
          {order.truck_registration && (
            <div>
              <p className="text-slate-500">Selected Truck</p>
              <p className="font-medium">{order.truck_registration}</p>
            </div>
          )}
        </div>
      )}

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="mb-3">
          <p className="text-slate-500 flex items-center gap-1 mb-1">
            <FileText className="w-3 h-3" />
            Notes
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-sm text-yellow-800">{order.special_instructions}</p>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-400">
        <p>Address: {order.customer_address}</p>
        <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
        {order.delivery_date && (
          <p>Delivery: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}</p>
        )}
      </div>
      
      <OrderStatusButtons 
        order={order} 
        onEdit={onEdit}
        onStatusUpdate={onStatusUpdate}
      />
    </div>
  );
}
