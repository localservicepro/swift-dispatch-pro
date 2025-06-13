
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface TruckTypeOption {
  value: TruckType;
  label: string;
  description: string;
}

interface TruckTypeSelectorProps {
  selectedTruckType: TruckType | "";
  onTruckTypeChange: (truckType: TruckType | "") => void;
}

const truckTypes: TruckTypeOption[] = [
  { value: 'small', label: 'Small Truck', description: 'Up to 3 tons - Local deliveries' },
  { value: 'medium', label: 'Medium Truck', description: 'Up to 8 tons - Regional deliveries' },
  { value: 'large', label: 'Large Truck', description: 'Up to 15 tons - Long distance' },
  { value: 'refrigerated', label: 'Refrigerated Truck', description: 'Temperature controlled cargo' }
];

export function TruckTypeSelector({ selectedTruckType, onTruckTypeChange }: TruckTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Truck className="w-4 h-4" />
        Truck Type *
      </Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {truckTypes.map((truck) => (
          <div
            key={truck.value}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedTruckType === truck.value 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onTruckTypeChange(truck.value)}
          >
            <div className="font-medium">{truck.label}</div>
            <div className="text-sm text-gray-600">{truck.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
