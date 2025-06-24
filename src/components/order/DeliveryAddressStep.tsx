
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Calendar, Clock } from "lucide-react";
import { Customer, SplitConfig } from "./types";
import { SuburbSelector } from "./SuburbSelector";
import { DeliveryScheduler } from "./DeliveryScheduler";

interface DeliveryAddressStepProps {
  customer: Customer;
  orderType: "single" | "split";
  deliveryAddress: string;
  sameAsBilling: boolean;
  useGlobalDeliveryAddress: boolean;
  splits: SplitConfig[];
  selectedSuburbId: string;
  deliveryRate: number;
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  onDeliveryAddressChange: (address: string) => void;
  onSameAsBillingChange: (same: boolean) => void;
  onUseGlobalDeliveryAddressChange: (use: boolean) => void;
  onSplitsChange: (splits: SplitConfig[]) => void;
  onSuburbChange: (suburbId: string, rate: number) => void;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryTimeChange: (time: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryAddressStep({
  customer,
  orderType,
  deliveryAddress,
  sameAsBilling,
  useGlobalDeliveryAddress,
  selectedSuburbId,
  deliveryRate,
  deliveryDate,
  deliveryTime,
  specialInstructions,
  onDeliveryAddressChange,
  onSameAsBillingChange,
  onSuburbChange,
  onDeliveryDateChange,
  onDeliveryTimeChange,
  onSpecialInstructionsChange,
  onBack,
  onNext
}: DeliveryAddressStepProps) {
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Step 5: Delivery Address & Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold">Delivery Address</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-as-billing"
              checked={sameAsBilling}
              onCheckedChange={(checked) => onSameAsBillingChange(checked as boolean)}
            />
            <Label htmlFor="same-as-billing">Same as billing address</Label>
          </div>

          {sameAsBilling ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Delivery Address: {customer.full_address}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="delivery-address">Delivery Address</Label>
              <Textarea
                id="delivery-address"
                value={deliveryAddress}
                onChange={(e) => onDeliveryAddressChange(e.target.value)}
                placeholder="Enter delivery address..."
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Suburb Selection */}
        <div>
          <SuburbSelector
            selectedSuburbId={selectedSuburbId}
            onSuburbChange={onSuburbChange}
          />
        </div>

        {/* Delivery Schedule - Only for single orders */}
        {orderType === "single" && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Delivery Schedule
            </h3>
            
            <DeliveryScheduler
              deliveryDate={deliveryDate}
              deliveryTime={deliveryTime}
              onDeliveryDateChange={onDeliveryDateChange}
              onDeliveryTimeChange={onDeliveryTimeChange}
            />
          </div>
        )}

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Special Delivery Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Any special instructions for the delivery..."
            value={specialInstructions}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!sameAsBilling && !deliveryAddress.trim()}
            className="ml-auto"
          >
            Continue to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
