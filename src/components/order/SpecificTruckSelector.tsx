
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Wrench, CheckCircle, AlertTriangle, Info, Clock } from "lucide-react";
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

  const getContextualStatusColor = (contextualStatus: string) => {
    switch (contextualStatus) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned_elsewhere': return 'bg-blue-100 text-blue-800';
      case 'conflicted': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'out_of_service': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContextualStatusIcon = (contextualStatus: string) => {
    switch (contextualStatus) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'assigned_elsewhere': return <Clock className="w-4 h-4" />;
      case 'conflicted': return <AlertTriangle className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  const getContextualStatusText = (contextualStatus: string) => {
    switch (contextualStatus) {
      case 'available': return 'AVAILABLE';
      case 'assigned_elsewhere': return 'AVAILABLE FOR SLOT';
      case 'conflicted': return 'CONFLICTED';
      case 'maintenance': return 'MAINTENANCE';
      case 'out_of_service': return 'OUT OF SERVICE';
      default: return 'UNKNOWN';
    }
  };

  const canSelectTruck = (truck: Truck) => {
    // Always allow selection if it's already selected (for editing)
    if (truck.id === selectedTruckId) return true;
    
    // If we don't have date/time, only allow based on global status
    if (!deliveryDate || !deliveryTime) {
      return truck.status === 'available';
    }
    
    // Check contextual availability
    const conflict = truckConflicts[truck.id];
    if (!conflict) return truck.status === 'available'; // Fallback to global status
    
    // Allow selection for available and assigned_elsewhere, block for others
    return ['available', 'assigned_elsewhere'].includes(conflict.contextualStatus);
  };

  const getTruckBorderColor = (truck: Truck, isSelected: boolean, isSelectable: boolean) => {
    if (isSelected) return 'border-blue-500 bg-blue-50';
    
    if (!isSelectable) return 'border-gray-200 bg-gray-50 opacity-60';
    
    const conflict = truckConflicts[truck.id];
    if (!conflict) return 'border-gray-200 hover:border-gray-300';
    
    switch (conflict.contextualStatus) {
      case 'available': return 'border-green-300 bg-green-50 hover:border-green-400';
      case 'assigned_elsewhere': return 'border-blue-300 bg-blue-50 hover:border-blue-400';
      case 'conflicted': return 'border-red-300 bg-red-50';
      default: return 'border-gray-200 hover:border-gray-300';
    }
  };

  const getConflictIcon = (truck: Truck) => {
    const conflict = truckConflicts[truck.id];
    if (!conflict) return null;
    
    switch (conflict.conflictType) {
      case 'exact': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'same-day': return <Info className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getSelectionMessage = (truck: Truck, isSelectable: boolean) => {
    if (truck.id === selectedTruckId) {
      return 'Currently selected for this order';
    }
    
    if (!deliveryDate || !deliveryTime) {
      if (!isSelectable) {
        return 'Set delivery date and time to check availability';
      }
      return null;
    }
    
    const conflict = truckConflicts[truck.id];
    if (conflict) {
      return conflict.message;
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
              Checking availability for {deliveryDate} at {deliveryTime}...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trucks.map((truck) => {
              const isSelectable = canSelectTruck(truck);
              const isSelected = selectedTruckId === truck.id;
              const borderColor = getTruckBorderColor(truck, isSelected, isSelectable);
              const conflictIcon = getConflictIcon(truck);
              const message = getSelectionMessage(truck, isSelectable);
              const conflict = truckConflicts[truck.id];
              
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
                    <Badge className={`flex items-center gap-1 ${
                      conflict 
                        ? getContextualStatusColor(conflict.contextualStatus)
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {conflict 
                        ? getContextualStatusIcon(conflict.contextualStatus)
                        : <Truck className="w-4 h-4" />
                      }
                      {conflict 
                        ? getContextualStatusText(conflict.contextualStatus)
                        : truck.status.replace('_', ' ').toUpperCase()
                      }
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {truck.capacity_tons && (
                      <div>Capacity: {truck.capacity_tons} tonnes</div>
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
                      isSelected 
                        ? 'text-blue-600' 
                        : isSelectable 
                        ? 'text-green-600' 
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
