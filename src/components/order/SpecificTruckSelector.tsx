
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Wrench, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useBatchedConflictDetection } from "./hooks/useBatchedConflictDetection";

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
  deliveryDate?: string;
  deliveryTime?: string;
  onTruckSelect: (truckId: string, truckDetails: Truck | null) => void;
  excludeOrderId?: string;
}

export function SpecificTruckSelector({ 
  selectedTruckType, 
  selectedTruckId,
  deliveryDate,
  deliveryTime,
  onTruckSelect,
  excludeOrderId
}: SpecificTruckSelectorProps) {
  // Fetch all trucks of the selected type
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

  // Use batched conflict detection
  const { truckConflicts, isChecking } = useBatchedConflictDetection(
    selectedTruckType,
    deliveryDate || '',
    deliveryTime || '',
    excludeOrderId
  );

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

  const canSelectTruck = (truck: Truck) => {
    // Always allow selection if truck is available
    if (truck.status === 'available') return true;
    
    // Always allow if it's already selected (for editing)
    if (truck.id === selectedTruckId) return true;
    
    // Don't allow selection for maintenance or out of service
    if (truck.status === 'maintenance' || truck.status === 'out_of_service') return false;
    
    // For assigned trucks, check conflicts
    if (truck.status === 'assigned') {
      // If we don't have date/time, don't allow selection
      if (!deliveryDate || !deliveryTime) return false;
      
      // If still checking conflicts, allow selection (optimistic)
      if (isChecking) return true;
      
      // Check conflict results
      const conflict = truckConflicts[truck.id];
      if (!conflict) return true; // No conflict data means available
      
      // Only block if there's an actual conflict (exact time)
      return !conflict.hasConflict;
    }
    
    return false;
  };

  const getTruckBorderColor = (truck: Truck, isSelected: boolean, isSelectable: boolean) => {
    if (isSelected) return 'border-blue-500 bg-blue-50';
    
    if (!isSelectable) return 'border-gray-200 bg-gray-50 opacity-60';
    
    const conflict = truckConflicts[truck.id];
    if (truck.status === 'assigned' && conflict?.hasConflict) {
      return 'border-red-300 bg-red-50';
    }
    
    if (truck.status === 'assigned' && deliveryDate && deliveryTime) {
      return 'border-yellow-300 bg-yellow-50 hover:border-yellow-400';
    }
    
    return 'border-gray-200 hover:border-gray-300';
  };

  const getConflictIcon = (truck: Truck) => {
    const conflict = truckConflicts[truck.id];
    if (!conflict || !conflict.hasConflict) return null;
    
    switch (conflict.conflictType) {
      case 'exact': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'same-day': return <Info className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getSelectionMessage = (truck: Truck, isSelectable: boolean) => {
    if (truck.id === selectedTruckId) {
      return truck.status === 'assigned' ? 'Currently selected for this order' : 'Selected';
    }
    
    if (!isSelectable) {
      if (truck.status === 'maintenance') return 'Under maintenance';
      if (truck.status === 'out_of_service') return 'Out of service';
      if (truck.status === 'assigned' && (!deliveryDate || !deliveryTime)) {
        return 'Set delivery date and time to check availability';
      }
      const conflict = truckConflicts[truck.id];
      if (truck.status === 'assigned' && conflict?.hasConflict) {
        return `Conflict: ${conflict.message}`;
      }
    }
    
    if (truck.status === 'assigned') {
      const conflict = truckConflicts[truck.id];
      if (conflict && !conflict.hasConflict && conflict.conflictType === 'same-day') {
        return 'Available for this time slot';
      }
    }
    
    return null;
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
        <>
          {isChecking && (
            <div className="text-sm text-blue-600 mb-2">
              Checking availability...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trucks.map((truck) => {
              const isSelectable = canSelectTruck(truck);
              const isSelected = selectedTruckId === truck.id;
              const borderColor = getTruckBorderColor(truck, isSelected, isSelectable);
              const conflictIcon = getConflictIcon(truck);
              const message = getSelectionMessage(truck, isSelectable);
              
              return (
                <div
                  key={truck.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${borderColor} ${
                    isSelectable ? '' : 'cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (isSelectable) {
                      onTruckSelect(truck.id, truck);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">{truck.registration_number}</div>
                      {conflictIcon}
                    </div>
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

                  {message && (
                    <div className={`text-xs mt-2 ${
                      isSelectable && truck.status === 'assigned' 
                        ? 'text-green-600' 
                        : isSelected 
                        ? 'text-blue-600' 
                        : 'text-red-600'
                    }`}>
                      {message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
