
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruckTypeSelector } from "./TruckTypeSelector";
import { SpecificTruckSelector } from "./SpecificTruckSelector";
import { Truck } from "lucide-react";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderTruckSelectionFormProps {
  formData: OrderFormData;
  onInputChange: (field: string, value: string) => void;
  orderId?: string;
}

export function OrderTruckSelectionForm({ formData, onInputChange, orderId }: OrderTruckSelectionFormProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">Truck Assignment</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="text-gray-700 font-medium">Truck Type</Label>
          <TruckTypeSelector
            selectedType={formData.truck_type}
            onTypeChange={(type) => onInputChange('truck_type', type)}
          />
        </div>

        {formData.truck_type && formData.truck_type !== 'none' && (
          <div>
            <Label className="text-gray-700 font-medium">Specific Truck</Label>
            <SpecificTruckSelector
              truckType={formData.truck_type}
              selectedTruckId={formData.truck_id}
              onTruckChange={(truckId) => onInputChange('truck_id', truckId)}
              excludeOrderId={orderId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
