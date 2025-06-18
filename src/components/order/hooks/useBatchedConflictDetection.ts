
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface ConflictResult {
  hasConflict: boolean;
  conflictType: 'exact' | 'overlap' | 'same-day' | 'none';
  message: string;
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
        // First, get all trucks of the selected type
        const { data: trucks, error: trucksError } = await supabase
          .from('trucks')
          .select('id')
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

        truckIds.forEach(truckId => {
          const truckOrders = orders?.filter(order => order.truck_id === truckId) || [];
          
          if (truckOrders.length === 0) {
            conflicts[truckId] = {
              hasConflict: false,
              conflictType: 'none',
              message: ''
            };
            return;
          }

          // Check for exact time conflicts
          const exactConflicts = truckOrders.filter(order => order.delivery_time === deliveryTime);
          
          if (exactConflicts.length > 0) {
            conflicts[truckId] = {
              hasConflict: true,
              conflictType: 'exact',
              message: `Truck has ${exactConflicts.length} delivery(ies) at the exact same time`
            };
            return;
          }

          // For now, only block exact conflicts - treat same day as info only
          conflicts[truckId] = {
            hasConflict: false,
            conflictType: 'same-day',
            message: `Truck has ${truckOrders.length} other delivery(ies) on the same day`
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
