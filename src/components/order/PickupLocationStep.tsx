import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, User, Phone, Calendar, Clock } from "lucide-react";

interface PickupLocationData {
  address: string;
  name: string;
  contactName: string;
  contactPhone: string;
  instructions: string;
  date: string;
  time: string;
}

interface PickupLocationStepProps {
  pickupLocation: PickupLocationData;
  onPickupLocationChange: (data: Partial<PickupLocationData>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PickupLocationStep({
  pickupLocation,
  onPickupLocationChange,
  onBack,
  onNext
}: PickupLocationStepProps) {
  const isValid = pickupLocation.address && pickupLocation.name && 
                  pickupLocation.contactName && pickupLocation.date && 
                  pickupLocation.time;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          Step 4: Pickup Location Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          Provide details about where to collect the products before delivery.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Location Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-address" className="text-sm font-medium">
                Pickup Address *
              </Label>
              <Input
                id="pickup-address"
                placeholder="Enter the pickup address"
                value={pickupLocation.address}
                onChange={(e) => onPickupLocationChange({ address: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-name" className="text-sm font-medium">
                Location Name *
              </Label>
              <Input
                id="pickup-name"
                placeholder="e.g., ABC Warehouse, Main Store"
                value={pickupLocation.name}
                onChange={(e) => onPickupLocationChange({ name: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-instructions" className="text-sm font-medium">
                Pickup Instructions
              </Label>
              <Textarea
                id="pickup-instructions"
                placeholder="Any special instructions for pickup (loading dock, access codes, etc.)"
                value={pickupLocation.instructions}
                onChange={(e) => onPickupLocationChange({ instructions: e.target.value })}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>

          {/* Right Column - Contact & Schedule */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="text-sm font-medium flex items-center gap-1">
                <User className="w-4 h-4" />
                Contact Person *
              </Label>
              <Input
                id="contact-name"
                placeholder="Contact person at pickup location"
                value={pickupLocation.contactName}
                onChange={(e) => onPickupLocationChange({ contactName: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="text-sm font-medium flex items-center gap-1">
                <Phone className="w-4 h-4" />
                Contact Phone
              </Label>
              <Input
                id="contact-phone"
                placeholder="Phone number"
                value={pickupLocation.contactPhone}
                onChange={(e) => onPickupLocationChange({ contactPhone: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-date" className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Pickup Date *
                </Label>
                <Input
                  id="pickup-date"
                  type="date"
                  value={pickupLocation.date}
                  onChange={(e) => onPickupLocationChange({ date: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup-time" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Pickup Time *
                </Label>
                <Input
                  id="pickup-time"
                  type="time"
                  value={pickupLocation.time}
                  onChange={(e) => onPickupLocationChange({ time: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Pickup & Delivery Process</h4>
              <p className="text-sm text-purple-700 mt-1">
                Our driver will first collect the products from the specified pickup location, 
                then deliver them to the customer's delivery address. Both locations will be 
                included in the delivery route.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!isValid}
            className="ml-auto"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}