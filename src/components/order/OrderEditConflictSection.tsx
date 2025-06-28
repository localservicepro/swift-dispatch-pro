
import React from 'react';
import { ConflictWarning } from './ConflictWarning';
import { ConflictResult } from '@/utils/conflictDetection';

interface OrderEditConflictSectionProps {
  deliveryDate: string;
  deliveryTime: string;
  driverConflict?: ConflictResult;
  truckConflict?: ConflictResult;
  isChecking: boolean;
}

export function OrderEditConflictSection({
  deliveryDate,
  deliveryTime,
  driverConflict,
  truckConflict,
  isChecking
}: OrderEditConflictSectionProps) {
  if (!deliveryDate || !deliveryTime) {
    return null;
  }

  return (
    <div className="space-y-2">
      <ConflictWarning 
        driverConflict={driverConflict}
        truckConflict={truckConflict}
      />
      {isChecking && (
        <div className="text-sm text-muted-foreground">
          Checking for conflicts...
        </div>
      )}
    </div>
  );
}
