
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { OrderFormData } from "./hooks/useOrderFormData";
import { SpecificTruckSelector } from "./SpecificTruckSelector";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Truck {
  id: string;
  registration_number: string;
  truck_type: TruckType;
  status: string;
  capacity_tons: number | null;
}

interface OrderTruckSelectionFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
  orderId: string;
}

export function OrderTruckSelectionForm({ formData, onInputChange, orderId }: OrderTruckSelectionFormProps) {
  const handleTruckSelect = (truckId: string, truckDetails: Truck | null) => {
    onInputChange('truck_id', truckId);
  };

  const handleTruckTypeChange = (value: string) => {
    onInputChange('truck_type', value);
    // Reset specific truck selection when truck type changes
    if (formData.truck_id && formData.truck_id !== 'none') {
      onInputChange('truck_id', 'none');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="truck_type">Truck Type</Label>
        <Select value={formData.truck_type} onValueChange={handleTruckTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select truck type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No truck assigned</SelectItem>
            <SelectItem value="small">Small Truck</SelectItem>
            <SelectItem value="medium">Medium Truck</SelectItem>
            <SelectItem value="large">Large Truck</SelectItem>
            <SelectItem value="crane">Crane Truck</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.truck_type && formData.truck_type !== 'none' && (
        <SpecificTruckSelector
          selectedTruckType={formData.truck_type as TruckType}
          selectedTruckId={formData.truck_id || ''}
          deliveryDate={formData.delivery_date}
          deliveryTime={formData.delivery_time}
          onTruckSelect={handleTruckSelect}
          excludeOrderId={orderId}
        />
      )}
    </div>
  );
}
