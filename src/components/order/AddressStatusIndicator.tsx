
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X, RotateCcw } from 'lucide-react';

interface AddressStatusIndicatorProps {
  selectedCustomer?: {
    first_name: string;
    last_name: string;
    full_address: string;
  } | null;
  isUsingCustomerAddress?: boolean;
  onClearAddress?: () => void;
  onResetToCustomerAddress?: () => void;
}

export function AddressStatusIndicator({
  selectedCustomer,
  isUsingCustomerAddress,
  onClearAddress,
  onResetToCustomerAddress
}: AddressStatusIndicatorProps) {
  if (!selectedCustomer) return null;

  return (
    <div className="space-y-2">
      {isUsingCustomerAddress && (
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <User className="w-3 h-3" />
          Using {selectedCustomer.first_name}'s address
        </Badge>
      )}

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
    </div>
  );
}
