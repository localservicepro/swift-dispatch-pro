
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";

interface TimeSlot {
  value: string;
  label: string;
}

interface DeliverySchedulerProps {
  deliveryDate: string;
  deliveryTime: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
}

const generateTimeSlots = (): TimeSlot[] => {
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      timeSlots.push({ value: time, label: displayTime });
    }
  }
  return timeSlots;
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export function DeliveryScheduler({ 
  deliveryDate, 
  deliveryTime, 
  onDeliveryDateChange, 
  onDeliveryTimeChange 
}: DeliverySchedulerProps) {
  const timeSlots = generateTimeSlots();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Delivery Date */}
      <div className="space-y-2">
        <Label htmlFor="delivery_date" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Delivery Date *
        </Label>
        <Input
          id="delivery_date"
          type="date"
          value={deliveryDate}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
          min={getTomorrowDate()}
        />
      </div>

      {/* Delivery Time */}
      <div className="space-y-2">
        <Label htmlFor="delivery_time" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Delivery Time *
        </Label>
        <Select value={deliveryTime} onValueChange={onDeliveryTimeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select time slot" />
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((slot) => (
              <SelectItem key={slot.value} value={slot.value}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
