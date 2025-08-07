
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
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
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={selectedCommonDate}
                onSelect={onDateSelect}
                disabled={isDateBeforeToday}
                initialFocus
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Common Time</Label>
          <Select value={commonDeliveryTime} onValueChange={onTimeChange}>
            <SelectTrigger className="w-full h-8 text-xs">
              <Clock className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
