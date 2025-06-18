
import { Database } from "@/integrations/supabase/types";

export type TruckType = Database["public"]["Enums"]["truck_type"];
export type DeliveryMethod = "delivery" | "pickup";

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
  suburb?: {
    name: string;
    state: string;
    delivery_rate: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  images: string[];
  category?: {
    name: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
  status: string;
  capacity_tons: number | null;
  fuel_type: string | null;
  year_manufactured: number | null;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
}

export interface SplitConfig {
  id: string;
  name: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  deliveryAddress?: string;
  sameAsBilling: boolean;
}
