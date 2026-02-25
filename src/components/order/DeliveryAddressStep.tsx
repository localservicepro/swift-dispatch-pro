import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimeSlotSelector } from '@/components/order/TimeSlotSelector';
import { OrderAddressForm } from '@/components/order/OrderAddressForm';
import { User, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/utils/timeSlotUtils';
import { isDateBeforeToday } from '@/utils/dateTimeUtils';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string, suburb?: any) => void;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
  selectedCustomer?: {
    first_name: string;
    last_name: string;
    full_address: string;
  } | null;
  isUsingCustomerAddress?: boolean;
  onClearAddress?: () => void;
  onResetToCustomerAddress?: () => void;
}

export function DeliveryAddressStep({ 
  formData, 
  deliveryDate,
  deliveryTime,
  onFormDataChange, 
  onSuburbChange,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onBack,
  onNext,
  selectedCustomer,
  isUsingCustomerAddress,
  onClearAddress,
  onResetToCustomerAddress
}: DeliveryAddressStepProps) {
  const timeSlots = generateTimeSlots();
  
  const handleContinue = () => {
    if (!formData.full_address || !formData.suburb_id || !deliveryDate || !deliveryTime) {
      return; // Don't proceed if required fields are missing
    }
    onNext();
  };

  const isValid = formData.full_address && formData.suburb_id && deliveryDate && deliveryTime;

  // Convert string date to Date object for calendar
  const selectedDate = deliveryDate ? new Date(deliveryDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDeliveryDateChange(format(date, 'yyyy-MM-dd'));
    }
  };

  const handleUseCustomerAddressToggle = (checked: boolean) => {
    if (checked && selectedCustomer?.full_address) {
      onResetToCustomerAddress?.();
    } else {
      onClearAddress?.();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Address & Schedule</h3>

        {/* Use customer address checkbox */}
        {selectedCustomer && selectedCustomer.full_address && (
          <div className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-customer-address"
                checked={isUsingCustomerAddress}
                onCheckedChange={handleUseCustomerAddressToggle}
              />
              <label
                htmlFor="use-customer-address"
                className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Use {selectedCustomer.first_name}'s registered address
              </label>
            </div>
            {isUsingCustomerAddress && (
              <p className="text-xs text-muted-foreground mt-2 pl-6">
                📍 {selectedCustomer.full_address}
              </p>
            )}
          </div>
        )}

        {/* Delivery Address Section */}
        <div className="space-y-3">
          <div className="border-b pb-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Delivery Address</h4>
            <OrderAddressForm
              formData={formData}
              deliveryRate="" // No longer used for calculations, just reference
              onFormDataChange={onFormDataChange}
              onSuburbChange={onSuburbChange}
            />
          </div>

          {/* Delivery Schedule Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Delivery Schedule</h4>
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
                      disabled={(date) => isDateBeforeToday(date)}
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
                <TimeSlotSelector
                  value={deliveryTime}
                  onValueChange={onDeliveryTimeChange}
                  placeholder="Select delivery time"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handleContinue}
          disabled={!isValid}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
