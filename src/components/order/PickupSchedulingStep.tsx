import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PickupScheduler } from "./PickupScheduler";

interface PickupSchedulingStepProps {
  pickupDate: string;
  pickupTime: string;
  onPickupDateChange: (date: string) => void;
  onPickupTimeChange: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PickupSchedulingStep({
  pickupDate,
  pickupTime,
  onPickupDateChange,
  onPickupTimeChange,
  onBack,
  onNext
}: PickupSchedulingStepProps) {
  const isValid = pickupDate && pickupTime;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Pickup Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Schedule when you'd like to pick up your order from our yard.
          </div>
          
          <PickupScheduler
            pickupDate={pickupDate}
            pickupTime={pickupTime}
            onPickupDateChange={onPickupDateChange}
            onPickupTimeChange={onPickupTimeChange}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center gap-2"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}