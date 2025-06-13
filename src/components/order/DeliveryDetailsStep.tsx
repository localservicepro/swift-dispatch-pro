
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Truck } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { TruckTypeSelector } from "./TruckTypeSelector";
import { DriverSelector } from "./DriverSelector";
import { DeliveryScheduler } from "./DeliveryScheduler";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface DeliveryDetailsStepProps {
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  driverId: string;
  specialInstructions: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onTruckTypeChange: (truckType: TruckType | "") => void;
  onDriverChange: (driverId: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryDetailsStep({
  deliveryDate,
  deliveryTime,
  truckType,
  driverId,
  specialInstructions,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onTruckTypeChange,
  onDriverChange,
  onSpecialInstructionsChange,
  onBack,
  onNext
}: DeliveryDetailsStepProps) {
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
          onTruckTypeChange={onTruckTypeChange}
        />

        <DriverSelector
          selectedDriverId={driverId}
          onDriverChange={onDriverChange}
        />

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
            disabled={!deliveryDate || !deliveryTime || !truckType}
            className="ml-auto"
          >
            Review Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
