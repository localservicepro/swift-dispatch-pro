
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Clock } from "lucide-react";
import { generateTimeSlots } from "@/utils/timeSlotUtils";

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
  const timeSlots = generateTimeSlots();
  const specialSlots = timeSlots.filter(s => ['urgent', 'asap', 'anytime'].includes(s.value));
  const regularSlots = timeSlots.filter(s => !['urgent', 'asap', 'anytime'].includes(s.value));

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
        <Select value={pickupTime} onValueChange={onPickupTimeChange}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select time..." />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectGroup>
              {specialSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value} className="font-medium">
                  {slot.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              {regularSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
