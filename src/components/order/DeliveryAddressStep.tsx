
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Home } from "lucide-react";
import { Customer, SplitConfig } from "./types";

interface DeliveryAddressStepProps {
  customer: Customer;
  orderType: "single" | "split";
  deliveryAddress: string;
  sameAsBilling: boolean;
  useGlobalDeliveryAddress: boolean;
  splits: SplitConfig[];
  onDeliveryAddressChange: (address: string) => void;
  onSameAsBillingChange: (same: boolean) => void;
  onUseGlobalDeliveryAddressChange: (useGlobal: boolean) => void;
  onSplitsChange: (splits: SplitConfig[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryAddressStep({
  customer,
  orderType,
  deliveryAddress,
  sameAsBilling,
  useGlobalDeliveryAddress,
  splits,
  onDeliveryAddressChange,
  onSameAsBillingChange,
  onUseGlobalDeliveryAddressChange,
  onSplitsChange,
  onBack,
  onNext
}: DeliveryAddressStepProps) {
  const handleSameAsBillingChange = (checked: boolean) => {
    onSameAsBillingChange(checked);
    if (checked) {
      onDeliveryAddressChange(customer.full_address);
      // Update all splits if using global delivery address
      if (orderType === "split" && useGlobalDeliveryAddress) {
        const updatedSplits = splits.map(split => ({
          ...split,
          sameAsBilling: true,
          deliveryAddress: customer.full_address
        }));
        onSplitsChange(updatedSplits);
      }
    }
  };

  const handleUseGlobalDeliveryAddressChange = (checked: boolean) => {
    onUseGlobalDeliveryAddressChange(checked);
    if (checked) {
      // Apply current delivery address settings to all splits
      const updatedSplits = splits.map(split => ({
        ...split,
        sameAsBilling,
        deliveryAddress: sameAsBilling ? customer.full_address : deliveryAddress
      }));
      onSplitsChange(updatedSplits);
    } else {
      // Initialize individual delivery addresses for splits
      const updatedSplits = splits.map(split => ({
        ...split,
        sameAsBilling: true,
        deliveryAddress: customer.full_address
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const handleDeliveryAddressChange = (address: string) => {
    onDeliveryAddressChange(address);
    // Update all splits if using global delivery address
    if (orderType === "split" && useGlobalDeliveryAddress && !sameAsBilling) {
      const updatedSplits = splits.map(split => ({
        ...split,
        deliveryAddress: address
      }));
      onSplitsChange(updatedSplits);
    }
  };

  const canProceed = () => {
    if (orderType === "single") {
      return sameAsBilling || deliveryAddress.trim() !== "";
    } else {
      if (useGlobalDeliveryAddress) {
        return sameAsBilling || deliveryAddress.trim() !== "";
      } else {
        // Check if all splits have valid delivery addresses
        return splits.every(split => 
          split.sameAsBilling || (split.deliveryAddress && split.deliveryAddress.trim() !== "")
        );
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Step 3: Delivery Address
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configure where the order should be delivered.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Address Display */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Home className="w-4 h-4" />
            Billing Address
          </h3>
          <p className="text-sm text-gray-700">{customer.full_address}</p>
        </div>

        {/* Same as Billing Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="same-as-billing"
            checked={sameAsBilling}
            onCheckedChange={handleSameAsBillingChange}
          />
          <Label htmlFor="same-as-billing" className="text-sm font-medium">
            Delivery address is the same as billing address
          </Label>
        </div>

        {/* Custom Delivery Address */}
        {!sameAsBilling && (
          <div>
            <Label htmlFor="delivery-address" className="text-sm font-medium">
              Delivery Address
            </Label>
            <Input
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => handleDeliveryAddressChange(e.target.value)}
              placeholder="Enter delivery address..."
              className="mt-1"
            />
          </div>
        )}

        {/* Split Order Global Address Option */}
        {orderType === "split" && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="use-global-delivery"
                checked={useGlobalDeliveryAddress}
                onCheckedChange={handleUseGlobalDeliveryAddressChange}
              />
              <Label htmlFor="use-global-delivery" className="text-sm font-medium">
                Use the same delivery address for all splits
              </Label>
            </div>
            
            {!useGlobalDeliveryAddress && (
              <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
                <p>You'll be able to set individual delivery addresses for each split in the next step.</p>
              </div>
            )}
          </div>
        )}

        {/* Address Preview for Split Orders */}
        {orderType === "split" && useGlobalDeliveryAddress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">All splits will be delivered to:</h4>
            <p className="text-sm text-blue-700">
              {sameAsBilling ? customer.full_address : deliveryAddress}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!canProceed()}
            className="ml-auto"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
