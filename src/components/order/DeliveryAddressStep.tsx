
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';
import { User, X, RotateCcw, Calendar as CalendarIcon, Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots } from '@/utils/timeSlotUtils';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Delivery Address & Schedule</h3>
          {isUsingCustomerAddress && selectedCustomer && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Using {selectedCustomer.first_name}'s address
            </Badge>
          )}
        </div>

        {/* Address status and quick actions */}
        {selectedCustomer && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isUsingCustomerAddress ? (
              <div className="flex items-center gap-2">
                <span>📍 Using registered customer address</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearAddress}
                  className="h-7 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Use different address
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>📝 Using custom delivery address</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetToCustomerAddress}
                  className="h-7 px-2 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset to customer address
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Delivery Address Section */}
        <div className="space-y-3">
          <div className="border-b pb-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Delivery Address</h4>
            <CustomerAddressForm
              formData={{
                full_address: formData.full_address,
                delivery_address: formData.full_address, // Use the same address for both in order context
                suburb_id: formData.suburb_id
              }}
              deliveryRate="" // No longer used for calculations, just reference
              onFormDataChange={(updates) => {
                // Map the updates back to the order form structure
                const orderUpdates: Partial<DeliveryAddressStepProps['formData']> = {};
                if (updates.full_address !== undefined) {
                  orderUpdates.full_address = updates.full_address;
                }
                if (updates.delivery_address !== undefined) {
                  orderUpdates.full_address = updates.delivery_address; // In orders, we use full_address
                }
                if (updates.suburb_id !== undefined) {
                  orderUpdates.suburb_id = updates.suburb_id;
                }
                onFormDataChange(orderUpdates);
              }}
              onSuburbChange={onSuburbChange}
            />
          </div>

          {/* Delivery Schedule Section */}
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
