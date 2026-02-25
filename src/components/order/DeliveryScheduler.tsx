
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";
import { TimeSlotSelector } from "./TimeSlotSelector";

interface DeliverySchedulerProps {
  deliveryDate: string;
  deliveryTime: string;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
}

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function DeliveryScheduler({ 
  deliveryDate, 
  deliveryTime, 
  onDeliveryDateChange, 
  onDeliveryTimeChange 
}: DeliverySchedulerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          min={getTodayDate()}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Delivery Time *
        </Label>
        <TimeSlotSelector
          value={deliveryTime}
          onValueChange={onDeliveryTimeChange}
          placeholder="Select time..."
        />
      </div>
    </div>
  );
}
