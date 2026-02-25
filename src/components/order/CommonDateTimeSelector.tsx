
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";
import { TimeSlotSelector } from "./TimeSlotSelector";

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
          <TimeSlotSelector
            value={commonDeliveryTime}
            onValueChange={onTimeChange}
            placeholder="Select time..."
            triggerClassName="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
