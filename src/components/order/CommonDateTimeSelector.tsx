
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateTimeSlots } from "@/utils/timeSlotUtils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";

interface CommonDateTimeSelectorProps {
  commonDeliveryDate: string;
  commonDeliveryTime: string;
  onDateSelect: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
}

export function CommonDateTimeSelector({
  commonDeliveryDate,
  commonDeliveryTime,
  onDateSelect,
  onTimeChange
}: CommonDateTimeSelectorProps) {
  const timeSlots = generateTimeSlots();
  const specialSlots = timeSlots.filter(s => ['urgent', 'asap', 'anytime'].includes(s.value));
  const regularSlots = timeSlots.filter(s => !['urgent', 'asap', 'anytime'].includes(s.value));
  const selectedCommonDate = commonDeliveryDate ? new Date(commonDeliveryDate) : undefined;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1 block">Common Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-8 text-xs",
                  !commonDeliveryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {commonDeliveryDate ? format(new Date(commonDeliveryDate), 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={selectedCommonDate}
                onSelect={onDateSelect}
                disabled={isDateBeforeToday}
                initialFocus
                className="rounded-md border pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Common Time</Label>
          <div className="border border-input rounded-md bg-background">
            <ScrollArea className="h-[150px]">
              <div className="p-0.5">
                {specialSlots.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => onTimeChange(slot.value)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors font-medium",
                      commonDeliveryTime === slot.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {slot.label}
                  </button>
                ))}
                <div className="mx-1 my-0.5 h-px bg-border" />
                {regularSlots.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => onTimeChange(slot.value)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors",
                      commonDeliveryTime === slot.value
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
    </div>
  );
}
