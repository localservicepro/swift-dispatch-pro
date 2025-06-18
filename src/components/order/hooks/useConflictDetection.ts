
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
      if (!deliveryDate || !deliveryTime) {
        setDriverConflict(undefined);
        setTruckConflict(undefined);
        return;
      }

      setIsChecking(true);

      try {
        const [driverResult, truckResult] = await Promise.all([
          checkDriverConflicts(driverId, deliveryDate, deliveryTime, excludeOrderId),
          checkTruckConflicts(truckId, deliveryDate, deliveryTime, excludeOrderId)
        ]);

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
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [deliveryDate, deliveryTime, driverId, truckId, excludeOrderId]);

  return {
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict: driverConflict?.hasConflict || truckConflict?.hasConflict
  };
}
