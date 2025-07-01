
import { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type TruckType = Database["public"]["Enums"]["truck_type"];

export interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  delivery_address?: string;
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
  delivery_suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
  truck_type?: TruckType;
  truck_id?: string;
  company_name?: string;
  business_name?: string;
  customer_type?: string;
  payment_method?: string;
  adjustments?: number;
}

export interface OrderEditFormProps {
  order: Order;
  onOrderUpdated: () => void;
  onClose: () => void;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictType?: 'exact' | 'overlap' | 'adjacent';
}

export interface BusinessInfo {
  company_name?: string;
  business_name?: string;
  customer_type?: string;
}
