
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface ConflictResult {
  hasConflict: boolean;
  conflictType: 'exact' | 'overlap' | 'same-day' | 'none';
  message: string;
  contextualStatus: 'available' | 'assigned_elsewhere' | 'conflicted' | 'maintenance' | 'out_of_service';
  globalStatus: string;
}

interface TruckConflictMap {
  [truckId: string]: ConflictResult;
}

export function useBatchedConflictDetection(
  truckType: TruckType | "",
  deliveryDate: string,
  deliveryTime: string,
  excludeOrderId?: string
) {
  const [truckConflicts, setTruckConflicts] = useState<TruckConflictMap>({});
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkAllTrucksConflicts = async () => {
      if (!truckType || !deliveryDate || !deliveryTime) {
        setTruckConflicts({});
        return;
      }

      setIsChecking(true);

      try {
        // Get all trucks of the selected type with their status
        const { data: trucks, error: trucksError } = await supabase
          .from('trucks')
          .select('id, status')
          .eq('truck_type', truckType)
          .eq('is_active', true);

        if (trucksError) throw trucksError;

        if (!trucks || trucks.length === 0) {
          setTruckConflicts({});
          setIsChecking(false);
          return;
        }

        const truckIds = trucks.map(truck => truck.id);

        // Get all orders for these trucks on the same date
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('truck_id, delivery_time')
          .in('truck_id', truckIds)
          .eq('delivery_date', deliveryDate)
          .not('status', 'in', '(delivered,cancelled)')
          .not('id', 'eq', excludeOrderId || '');

        if (ordersError) throw ordersError;

        // Process conflicts for each truck
        const conflicts: TruckConflictMap = {};

        trucks.forEach(truck => {
          const truckOrders = orders?.filter(order => order.truck_id === truck.id) || [];
          
          // Check global status first (maintenance, out of service)
          if (truck.status === 'maintenance') {
            conflicts[truck.id] = {
              hasConflict: true,
              conflictType: 'none',
              message: 'Under maintenance',
              contextualStatus: 'maintenance',
              globalStatus: truck.status
            };
            return;
          }

          if (truck.status === 'out_of_service') {
            conflicts[truck.id] = {
              hasConflict: true,
              conflictType: 'none',
              message: 'Out of service',
              contextualStatus: 'out_of_service',
              globalStatus: truck.status
            };
            return;
          }

          // For available or assigned trucks, check time-based conflicts
          if (truckOrders.length === 0) {
            conflicts[truck.id] = {
              hasConflict: false,
              conflictType: 'none',
              message: 'Available for this time slot',
              contextualStatus: 'available',
              globalStatus: truck.status
            };
            return;
          }

          // Check for exact time conflicts
          const exactConflicts = truckOrders.filter(order => order.delivery_time === deliveryTime);
          
          if (exactConflicts.length > 0) {
            conflicts[truck.id] = {
              hasConflict: true,
              conflictType: 'exact',
              message: `Conflicted - has ${exactConflicts.length} delivery(ies) at the same time`,
              contextualStatus: 'conflicted',
              globalStatus: truck.status
            };
            return;
          }

          // Truck is assigned to other times on the same day but available for this slot
          conflicts[truck.id] = {
            hasConflict: false,
            conflictType: 'same-day',
            message: `Available for this slot (has ${truckOrders.length} other delivery(ies) on same day)`,
            contextualStatus: 'assigned_elsewhere',
            globalStatus: truck.status
          };
        });

        setTruckConflicts(conflicts);
      } catch (error) {
        console.error('Error checking truck conflicts:', error);
        setTruckConflicts({});
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce the conflict checking
    const timeoutId = setTimeout(checkAllTrucksConflicts, 300);
    return () => clearTimeout(timeoutId);
  }, [truckType, deliveryDate, deliveryTime, excludeOrderId]);

  return {
    truckConflicts,
    isChecking
  };
}
