
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { OrderFormData } from "./hooks/useOrderFormData";

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
  // Fetch available trucks based on selected truck type
  const { data: availableTrucks = [] } = useQuery({
    queryKey: ['available-trucks', formData.truck_type],
    queryFn: async () => {
      if (!formData.truck_type || formData.truck_type === 'none') return [];
      
      const { data, error } = await supabase
        .from('trucks')
        .select('id, registration_number, truck_type, status, capacity_tons')
        .eq('truck_type', formData.truck_type as TruckType)
        .eq('is_active', true)
        .order('registration_number');

      if (error) throw error;
      return data;
    },
    enabled: !!formData.truck_type && formData.truck_type !== 'none',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'out_of_service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="truck_type">Truck Type</Label>
        <Select value={formData.truck_type} onValueChange={(value) => onInputChange('truck_type', value)}>
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
        <div>
          <Label htmlFor="truck_id">Specific Truck</Label>
          <Select value={formData.truck_id} onValueChange={(value) => onInputChange('truck_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select specific truck" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific truck</SelectItem>
              {availableTrucks.map((truck) => (
                <SelectItem 
                  key={truck.id} 
                  value={truck.id}
                  disabled={truck.status !== 'available' && truck.id !== formData.truck_id}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{truck.registration_number}</span>
                    <Badge className={`ml-2 ${getStatusColor(truck.status)}`}>
                      {truck.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
