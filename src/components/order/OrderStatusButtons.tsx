
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
}

interface OrderStatusButtonsProps {
  order: Order;
  onEdit: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, currentOrder: Order) => void;
}

export function OrderStatusButtons({ order, onEdit, onStatusUpdate }: OrderStatusButtonsProps) {
  return (
    <div className="flex gap-2 mt-4">
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => onEdit(order)}
      >
        Edit
      </Button>
      
      {/* Quick status update buttons for admin */}
      {order.status === 'preparing' && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onStatusUpdate(order.id, 'loading', order)}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          Mark Loading
        </Button>
      )}
      
      {order.status === 'loading' && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onStatusUpdate(order.id, 'en_route', order)}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          Mark En Route
        </Button>
      )}
      
      {order.status === 'en_route' && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onStatusUpdate(order.id, 'delivered', order)}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          Mark Delivered
        </Button>
      )}
      
      <Button 
        size="sm" 
        variant="outline" 
        className="text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => onStatusUpdate(order.id, 'cancelled', order)}
      >
        Cancel
      </Button>
    </div>
  );
}
