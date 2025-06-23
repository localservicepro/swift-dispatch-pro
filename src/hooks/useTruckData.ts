
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Truck = Database["public"]["Tables"]["trucks"]["Row"];
type TruckInsert = Database["public"]["Tables"]["trucks"]["Insert"];
type TruckUpdate = Database["public"]["Tables"]["trucks"]["Update"];
type TruckStatus = "available" | "assigned" | "maintenance" | "out_of_service";

export function useTruckData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all trucks
  const { data: trucks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      console.log('Fetching trucks...');
      
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('is_active', true)
        .order('registration_number');

      if (error) {
        console.error('Error fetching trucks:', error);
        throw error;
      }

      console.log('Trucks fetched:', data);
      return data as Truck[];
    },
  });

  // Get truck statistics
  const getTruckStats = () => {
    const totalTrucks = trucks.length;
    const availableTrucks = trucks.filter(truck => truck.status === 'available').length;
    const assignedTrucks = trucks.filter(truck => truck.status === 'assigned').length;
    const maintenanceTrucks = trucks.filter(truck => truck.status === 'maintenance').length;
    const outOfServiceTrucks = trucks.filter(truck => truck.status === 'out_of_service').length;

    return {
      total: totalTrucks,
      available: availableTrucks,
      assigned: assignedTrucks,
      maintenance: maintenanceTrucks,
      outOfService: outOfServiceTrucks,
      utilizationRate: totalTrucks > 0 ? Math.round((assignedTrucks / totalTrucks) * 100) : 0
    };
  };

  // Update truck status
  const updateTruckStatus = useMutation({
    mutationFn: async ({ truckId, status }: { truckId: string; status: TruckStatus }) => {
      const { error } = await supabase
        .from('trucks')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', truckId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating truck status:', error);
      toast({
        title: "Error",
        description: "Failed to update truck status",
        variant: "destructive",
      });
    },
  });

  // Add new truck
  const addTruck = useMutation({
    mutationFn: async (truckData: TruckInsert) => {
      const { error } = await supabase
        .from('trucks')
        .insert(truckData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck added successfully",
      });
    },
    onError: (error) => {
      console.error('Error adding truck:', error);
      toast({
        title: "Error",
        description: "Failed to add truck",
        variant: "destructive",
      });
    },
  });

  // Update truck
  const updateTruck = useMutation({
    mutationFn: async ({ truckId, updates }: { truckId: string; updates: TruckUpdate }) => {
      const { error } = await supabase
        .from('trucks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', truckId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast({
        title: "Success",
        description: "Truck updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating truck:', error);
      toast({
        title: "Error",
        description: "Failed to update truck",
        variant: "destructive",
      });
    },
  });

  return {
    trucks,
    isLoading,
    error,
    refetch,
    getTruckStats,
    updateTruckStatus: updateTruckStatus.mutate,
    addTruck: addTruck.mutate,
    updateTruck: updateTruck.mutate,
    isUpdatingStatus: updateTruckStatus.isPending,
    isAddingTruck: addTruck.isPending,
    isUpdatingTruck: updateTruck.isPending,
  };
}
