
import { Database } from "@/integrations/supabase/types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type OrderFormData = {
  customer_id: string;
  order_number?: string;
  delivery_date: string;
  customer_address: string;
  total_amount: number;
  payment_status: string;
  status: Database["public"]["Enums"]["order_status"];
  notes?: string;
  items: OrderItem[];
};

export type OrderItem = {
  product_id: string;
  quantity: number;
  price: number;
  total: number;
};

export type Product = Database["public"]["Tables"]["products"]["Row"];

export type CustomerType = "account" | "trade";

