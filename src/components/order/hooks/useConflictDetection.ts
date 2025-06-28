
import { useState, useEffect } from 'react';
import { checkDriverConflicts, checkTruckConflicts, ConflictResult } from '@/utils/conflictDetection';

export function useConflictDetection(
  deliveryDate: string,
  deliveryTime: string,
  driverId: string,
  truckId: string,
  excludeOrderId?: string
) {
  const [driverConflict, setDriverConflict] = useState<ConflictResult | undefined>();
  const [truckConflict, setTruckConflict] = useState<ConflictResult | undefined>();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkConflicts = async () => {
      // Don't check conflicts if essential data is missing
      if (!deliveryDate || !deliveryTime || (!driverId || driverId === 'unassigned') && (!truckId || truckId === 'none')) {
        setDriverConflict(undefined);
        setTruckConflict(undefined);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      try {
        const promises = [];
        
        // Only check driver conflicts if driver is assigned
        if (driverId && driverId !== 'unassigned') {
          promises.push(checkDriverConflicts(driverId, deliveryDate, deliveryTime, excludeOrderId));
        } else {
          promises.push(Promise.resolve(undefined));
        }
        
        // Only check truck conflicts if truck is assigned
        if (truckId && truckId !== 'none') {
          promises.push(checkTruckConflicts(truckId, deliveryDate, deliveryTime, excludeOrderId));
        } else {
          promises.push(Promise.resolve(undefined));
        }

        const [driverResult, truckResult] = await Promise.all(promises);

        setDriverConflict(driverResult);
        setTruckConflict(truckResult);
      } catch (error) {
        console.error('Error checking conflicts:', error);
        setDriverConflict(undefined);
        setTruckConflict(undefined);
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce the conflict checking to avoid too many API calls
    const timeoutId = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timeoutId);
  }, [deliveryDate, deliveryTime, driverId, truckId, excludeOrderId]);

  return {
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict: driverConflict?.hasConflict || truckConflict?.hasConflict
  };
}
