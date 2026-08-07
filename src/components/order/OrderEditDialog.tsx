
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { OrderEditHeader } from "./OrderEditHeader";
import { OrderEditForm } from "./OrderEditForm";
import { SplitOrderEditTabs } from "./SplitOrderEditTabs";


type OrderStatus = Database["public"]["Enums"]["order_status"];
type TruckType = Database["public"]["Enums"]["truck_type"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
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
  adjustments?: number;
  truck_type?: TruckType;
  truck_id?: string;
  customer_type?: string;
  company_name?: string;
}

interface OrderEditDialogProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

export function OrderEditDialog({ order, onOrderUpdated, onClose }: OrderEditDialogProps) {
  const [splits, setSplits] = useState<any[] | null>(null);

  // A master order in a split group is edited through per-split tabs.
  useEffect(() => {
    let cancelled = false;
    const loadSplits = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('master_order_id', order.id)
        .is('deleted_at', null)
        .order('split_number', { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error('Failed to load split orders:', error);
          setSplits([]);
        } else {
          setSplits(data || []);
        }
      }
    };
    loadSplits();
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const hasSplits = !!splits && splits.length > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <OrderEditHeader 
          orderNumber={order.order_number}
          purchaseOrder={order.purchase_order}
          customerName={order.customer_name}
          customerType={order.customer_type}
          companyName={order.company_name}
        />
        {splits === null ? (
          <div className="py-8 text-sm text-muted-foreground text-center">Loading order…</div>
        ) : hasSplits ? (
          <SplitOrderEditTabs
            masterOrder={order as any}
            splits={splits as any}
            onOrderUpdated={onOrderUpdated}
            onClose={onClose}
          />
        ) : (
          <OrderEditForm 
            order={order}
            onOrderUpdated={onOrderUpdated}
            onClose={onClose}
          />
        )}
      </DialogContent>

    </Dialog>
  );
}
