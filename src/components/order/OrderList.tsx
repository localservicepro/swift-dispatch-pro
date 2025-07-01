import { Button } from "@/components/ui/button";
import { OrderCard } from "./OrderCard";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address?: string;
  products: any;
  products_formatted?: string;
  total_amount: number;
  status: OrderStatus;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  order_notes?: string;
  delivery_notes?: string;
  driver_name?: string;
  truck_registration?: string;
  truck_type_display?: string;
  suburb_name?: string;
  suburb_state?: string;
  suburb_postcode?: string;
  delivery_suburb_name?: string;
  delivery_suburb_state?: string;
  delivery_suburb_postcode?: string;
}

interface OrderListProps {
  orders: Order[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus, currentOrder: Order) => void;
  onNotesEdit: (order: Order) => void;
}

export function OrderList({ 
  orders, 
  isLoading, 
  hasActiveFilters, 
  onClearFilters,
  onEdit,
  onDelete,
  onStatusUpdate,
  onNotesEdit
}: OrderListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-slate-600">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        {hasActiveFilters ? (
          <div>
            <p>No orders match your current filters.</p>
            <Button variant="outline" onClick={onClearFilters} className="mt-2">
              Clear Filters
            </Button>
          </div>
        ) : (
          <p>No orders found. Create your first order to get started!</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusUpdate={onStatusUpdate}
          onNotesEdit={onNotesEdit}
        />
      ))}
    </div>
  );
}
