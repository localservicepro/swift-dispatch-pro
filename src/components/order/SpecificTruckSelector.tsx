
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Wrench, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface Truck {
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

interface SpecificTruckSelectorProps {
  selectedTruckType: TruckType | "";
  selectedTruckId: string;
  onTruckSelect: (truckId: string, truckDetails: Truck | null) => void;
}

export function SpecificTruckSelector({ 
  selectedTruckType, 
  selectedTruckId, 
  onTruckSelect 
}: SpecificTruckSelectorProps) {
  // Fetch available trucks of the selected type
  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks', selectedTruckType],
    queryFn: async () => {
      if (!selectedTruckType) return [];
      
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('truck_type', selectedTruckType)
        .eq('is_active', true)
        .order('registration_number');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedTruckType,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  if (!selectedTruckType) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-400">
          <Truck className="w-4 h-4" />
          Select Specific Truck
        </Label>
        <p className="text-sm text-gray-500">Please select a truck type first</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Truck className="w-4 h-4" />
        Select Specific Truck *
      </Label>
      
      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading available trucks...</p>
        </div>
      ) : trucks.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No trucks available for the selected type</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trucks.map((truck) => (
            <div
              key={truck.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedTruckId === truck.id
                  ? 'border-blue-500 bg-blue-50'
                  : truck.status === 'available'
                  ? 'border-gray-200 hover:border-gray-300'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
              onClick={() => {
                if (truck.status === 'available') {
                  onTruckSelect(truck.id, truck);
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-lg">{truck.registration_number}</div>
                <Badge className={`flex items-center gap-1 ${getStatusColor(truck.status)}`}>
                  {getStatusIcon(truck.status)}
                  {truck.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                {truck.capacity_tons && (
                  <div>Capacity: {truck.capacity_tons} tons</div>
                )}
                {truck.fuel_type && (
                  <div>Fuel: {truck.fuel_type}</div>
                )}
                {truck.year_manufactured && (
                  <div>Year: {truck.year_manufactured}</div>
                )}
              </div>

              {truck.status !== 'available' && (
                <div className="text-xs text-red-600 mt-2">
                  {truck.status === 'assigned' && 'Currently assigned to another order'}
                  {truck.status === 'maintenance' && 'Under maintenance'}
                  {truck.status === 'out_of_service' && 'Out of service'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
