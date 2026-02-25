
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Store, Clock } from "lucide-react";
import { TimeSlotSelector } from "./TimeSlotSelector";

interface PickupSchedulerProps {
  pickupDate: string;
  pickupTime: string;
  onPickupDateChange: (date: string) => void;
  onPickupTimeChange: (time: string) => void;
}

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function PickupScheduler({ 
  pickupDate, 
  pickupTime, 
  onPickupDateChange, 
  onPickupTimeChange 
}: PickupSchedulerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="pickup_date" className="flex items-center gap-2">
          <Store className="w-4 h-4" />
          Pickup Date *
        </Label>
        <Input
          id="pickup_date"
          type="date"
          value={pickupDate}
          onChange={(e) => onPickupDateChange(e.target.value)}
          min={getTodayDate()}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pickup Time *
        </Label>
        <TimeSlotSelector
          value={pickupTime}
          onValueChange={onPickupTimeChange}
          placeholder="Select time..."
        />
      </div>
    </div>
  );
}
