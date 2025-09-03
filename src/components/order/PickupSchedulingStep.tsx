import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PickupScheduler } from "./PickupScheduler";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PickupSchedulingStepProps {
  pickupDate: string;
  pickupTime: string;
  pickupTiming: "now" | "scheduled";
  onPickupDateChange: (date: string) => void;
  onPickupTimeChange: (time: string) => void;
  onPickupTimingChange: (timing: "now" | "scheduled") => void;
  onBack: () => void;
  onNext: () => void;
}

export function PickupSchedulingStep({
  pickupDate,
  pickupTime,
  pickupTiming,
  onPickupDateChange,
  onPickupTimeChange,
  onPickupTimingChange,
  onBack,
  onNext
}: PickupSchedulingStepProps) {
  const isValid = pickupTiming === "now" || (pickupTiming === "scheduled" && pickupDate && pickupTime);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Pickup Scheduling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Choose when you'd like to pick up your order from our yard.
          </div>
          
          <RadioGroup 
            value={pickupTiming} 
            onValueChange={(value: "now" | "scheduled") => onPickupTimingChange(value)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent/50">
              <RadioGroupItem value="now" id="pickup-now" />
              <Label htmlFor="pickup-now" className="flex-1 cursor-pointer">
                <div className="font-medium">Pick up now</div>
                <div className="text-sm text-muted-foreground">Order will be marked as delivered immediately</div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent/50">
              <RadioGroupItem value="scheduled" id="pickup-scheduled" />
              <Label htmlFor="pickup-scheduled" className="flex-1 cursor-pointer">
                <div className="font-medium">Schedule pickup</div>
                <div className="text-sm text-muted-foreground">Choose a specific date and time for pickup</div>
              </Label>
            </div>
          </RadioGroup>

          {pickupTiming === "scheduled" && (
            <PickupScheduler
              pickupDate={pickupDate}
              pickupTime={pickupTime}
              onPickupDateChange={onPickupDateChange}
              onPickupTimeChange={onPickupTimeChange}
            />
          )}
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