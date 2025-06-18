
import { Database } from "@/integrations/supabase/types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type OrderFormData = {
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  order_number?: string;
  delivery_date: string;
  customer_address: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  adjustments?: number;
  payment_status: string;
  status: Database["public"]["Enums"]["order_status"];
  notes?: string;
  items: OrderItem[];
  // Split order specific fields
  is_split_order?: boolean;
  master_order_id?: string;
  split_number?: number;
  truck_type?: Database["public"]["Enums"]["truck_type"];
  truck_id?: string;
  driver_id?: string;
  delivery_time?: string;
  special_instructions?: string;
  payment_method?: string;
};

export type OrderItem = {
  product_id: string;
  quantity: number;
  price: number;
  total: number;
};

export type Product = Database["public"]["Tables"]["products"]["Row"];

export type CustomerType = "account" | "trade";

export type SplitOrderData = {
  customer_id: string;
  customer_name: string;
  customer_address: string;
  payment_method: string;
  splits: Array<{
    id: string;
    name: string;
    products: Array<{
      productId: string;
      quantity: number;
    }>;
    truckType: Database["public"]["Enums"]["truck_type"];
    truckId: string;
    driverId: string;
    deliveryDate: string;
    deliveryTime: string;
    specialInstructions: string;
  }>;
  adjustments: number;
  deliveryFee: number;
};
