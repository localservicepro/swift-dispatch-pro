
import { Database } from "@/integrations/supabase/types";
import { Truck, Package, Construction, TruckIcon } from "lucide-react";

type TruckType = Database["public"]["Enums"]["truck_type"];

export interface TruckTypeInfo {
  value: TruckType;
  label: string;
  description: string;
  capacity: string;
  icon: any;
  colorClass: string;
  bgClass: string;
}

export const truckTypeInfo: Record<TruckType, TruckTypeInfo> = {
  small: {
    value: 'small',
    label: 'Small Truck',
    description: 'Local deliveries',
    capacity: 'Up to 3 tonnes',
    icon: Package,
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-100'
  },
  medium: {
    value: 'medium',
    label: 'Medium Truck', 
    description: 'Regional deliveries',
    capacity: 'Up to 8 tonnes',
    icon: Truck,
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100'
  },
  large: {
    value: 'large',
    label: 'Large Truck',
    description: 'Long distance',
    capacity: 'Up to 15 tonnes',
    icon: TruckIcon,
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-100'
  },
  crane: {
    value: 'crane',
    label: 'Crane Truck',
    description: 'Heavy lifting',
    capacity: 'Specialized cargo',
    icon: Construction,
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-100'
  }
};

export const getTruckInfo = (truckType: TruckType | null): TruckTypeInfo | null => {
  if (!truckType) return null;
  return truckTypeInfo[truckType];
};
