import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Store, Clock } from "lucide-react";
import { generateTimeSlots } from "@/utils/timeSlotUtils";
import { cn } from "@/lib/utils";

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
        <div className="border border-input rounded-md">
          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {specialSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => onPickupTimeChange(slot.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors font-medium",
                    pickupTime === slot.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {slot.label}
                </button>
              ))}
              <div className="mx-2 my-1 h-px bg-border" />
              {regularSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => onPickupTimeChange(slot.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors",
                    pickupTime === slot.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
