
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Database } from "@/integrations/supabase/types";
import { OrderEditHeader } from "./OrderEditHeader";
import { OrderEditForm } from "./OrderEditForm";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

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
  truck_type?: TruckType;
  truck_id?: string;
}

interface OrderEditDialogProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

export function OrderEditDialog({ order, onOrderUpdated, onClose }: OrderEditDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <OrderEditHeader orderNumber={order.order_number} />
        <OrderEditForm 
          order={order}
          onOrderUpdated={onOrderUpdated}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
