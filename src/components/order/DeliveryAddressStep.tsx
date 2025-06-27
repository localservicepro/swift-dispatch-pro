
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';
import { User, X, RotateCcw, Calendar, Clock } from 'lucide-react';

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
  const handleContinue = () => {
    if (!formData.full_address || !formData.suburb_id || !deliveryDate || !deliveryTime) {
      return; // Don't proceed if required fields are missing
    }
    onNext();
  };

  const isValid = formData.full_address && formData.suburb_id && deliveryDate && deliveryTime;

  // Get today's date in YYYY-MM-DD format for minimum date
  const today = new Date().toISOString().split('T')[0];

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
              formData={formData}
              deliveryRate="" // No longer used for calculations, just reference
              onFormDataChange={onFormDataChange}
              onSuburbChange={onSuburbChange}
            />
          </div>

          {/* Delivery Schedule Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Delivery Schedule</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-date" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Delivery Date
                </Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => onDeliveryDateChange(e.target.value)}
                  min={today}
                  className="w-full"
                  placeholder="Select delivery date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-time" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Delivery Time
                </Label>
                <Input
                  id="delivery-time"
                  type="time"
                  value={deliveryTime}
                  onChange={(e) => onDeliveryTimeChange(e.target.value)}
                  className="w-full"
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
