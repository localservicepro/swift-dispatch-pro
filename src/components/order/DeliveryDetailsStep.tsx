
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Truck } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { TruckTypeSelector } from "./TruckTypeSelector";
import { SpecificTruckSelector } from "./SpecificTruckSelector";
import { DriverSelector } from "./DriverSelector";
import { DeliveryScheduler } from "./DeliveryScheduler";
import { ConflictWarning } from "./ConflictWarning";
import { useConflictDetection } from "./hooks/useConflictDetection";

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

interface DeliveryDetailsStepProps {
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  specialInstructions: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onTruckTypeChange: (truckType: TruckType | "") => void;
  onTruckSelect: (truckId: string, truckDetails: Truck | null) => void;
  onDriverChange: (driverId: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryDetailsStep({
  deliveryDate,
  deliveryTime,
  truckType,
  truckId,
  driverId,
  specialInstructions,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onTruckTypeChange,
  onTruckSelect,
  onDriverChange,
  onSpecialInstructionsChange,
  onBack,
  onNext
}: DeliveryDetailsStepProps) {
  const handleTruckTypeChange = (newTruckType: TruckType | "") => {
    onTruckTypeChange(newTruckType);
    // Reset specific truck selection when truck type changes
    if (truckId) {
      onTruckSelect("", null);
    }
  };

  // Use conflict detection hook
  const {
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict
  } = useConflictDetection(
    deliveryDate,
    deliveryTime,
    driverId,
    truckId
  );

  const getButtonText = () => {
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "Continue Despite Conflicts";
      }
    }
    return "Review Order";
  };

  const getButtonStyle = () => {
    if (hasAnyConflict) {
      const criticalConflicts = [driverConflict, truckConflict].filter(
        conflict => conflict?.hasConflict && (conflict.conflictType === 'exact' || conflict.conflictType === 'overlap')
      );
      
      if (criticalConflicts.length > 0) {
        return "bg-orange-600 hover:bg-orange-700";
      }
    }
    return "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Step 3: Delivery Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DeliveryScheduler
          deliveryDate={deliveryDate}
          deliveryTime={deliveryTime}
          onDeliveryDateChange={onDeliveryDateChange}
          onDeliveryTimeChange={onDeliveryTimeChange}
        />

        <TruckTypeSelector
          selectedTruckType={truckType}
          onTruckTypeChange={handleTruckTypeChange}
        />

        <SpecificTruckSelector
          selectedTruckType={truckType}
          selectedTruckId={truckId}
          onTruckSelect={onTruckSelect}
        />

        <DriverSelector
          selectedDriverId={driverId}
          onDriverChange={onDriverChange}
        />

        {/* Conflict Warning Section */}
        {(deliveryDate && deliveryTime) && (
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
        )}

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Special Delivery Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Any special instructions for the delivery..."
            value={specialInstructions}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!deliveryDate || !deliveryTime || !truckType || !truckId}
            className={`ml-auto ${getButtonStyle()}`}
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
