
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerAddressForm } from '@/components/customer/CustomerAddressForm';
import { User, X, RotateCcw } from 'lucide-react';

interface DeliveryAddressStepProps {
  formData: {
    full_address: string;
    suburb_id: string;
  };
  onFormDataChange: (updates: Partial<DeliveryAddressStepProps['formData']>) => void;
  onSuburbChange: (suburbId: string) => void;
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
  onFormDataChange, 
  onSuburbChange,
  onBack,
  onNext,
  selectedCustomer,
  isUsingCustomerAddress,
  onClearAddress,
  onResetToCustomerAddress
}: DeliveryAddressStepProps) {
  const handleContinue = () => {
    if (!formData.full_address || !formData.suburb_id) {
      return; // Don't proceed if required fields are missing
    }
    onNext();
  };

  const isValid = formData.full_address && formData.suburb_id;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Delivery Address</h3>
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

        <CustomerAddressForm
          formData={formData}
          deliveryRate="" // No longer used for calculations, just reference
          onFormDataChange={onFormDataChange}
          onSuburbChange={onSuburbChange}
        />
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
