
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
  payment_status?: string;
  adjustments?: number;
  contact_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  delivery_method?: string;
  fuel_surcharge?: number;
  order_notes?: string;
  delivery_notes?: string;
  fuel_surcharge?: number;
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
