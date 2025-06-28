
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/utils/timeSlotUtils';

interface DeliveryScheduleSectionProps {
  deliveryDate: string;
  deliveryTime: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
}

export function DeliveryScheduleSection({
  deliveryDate,
  deliveryTime,
  onDeliveryDateChange,
  onDeliveryTimeChange
}: DeliveryScheduleSectionProps) {
  const timeSlots = generateTimeSlots();
  
  // Get today's date for minimum date selection
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Convert string date to Date object for calendar
  const selectedDate = deliveryDate ? new Date(deliveryDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDeliveryDateChange(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Delivery Schedule</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Delivery Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Delivery Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deliveryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deliveryDate ? format(new Date(deliveryDate), 'PPP') : 'Select delivery date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < tomorrow}
                initialFocus
                className="rounded-md border pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Delivery Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Delivery Time
          </Label>
          <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select delivery time" />
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
