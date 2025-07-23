
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Store, MapPin } from "lucide-react";

type DeliveryMethod = "delivery" | "pickup" | "pickup_delivery";

interface DeliveryMethodSelectionStepProps {
  deliveryMethod: DeliveryMethod | "";
  onDeliveryMethodChange: (method: DeliveryMethod) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DeliveryMethodSelectionStep({
  deliveryMethod,
  onDeliveryMethodChange,
  onBack,
  onNext
}: DeliveryMethodSelectionStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Delivery Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">
          How would you like the customer to receive their order?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              deliveryMethod === "delivery"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onDeliveryMethodChange("delivery")}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <Truck className="w-12 h-12 text-blue-600" />
              <h3 className="text-lg font-semibold">Delivery</h3>
              <p className="text-sm text-muted-foreground">
                We'll deliver the order to the customer's address
              </p>
            </div>
          </div>

          <div
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              deliveryMethod === "pickup"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onDeliveryMethodChange("pickup")}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <Store className="w-12 h-12 text-green-600" />
              <h3 className="text-lg font-semibold">Yard Sale / Pickup</h3>
              <p className="text-sm text-muted-foreground">
                Customer will pick up the order from our yard
              </p>
            </div>
          </div>

          <div
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              deliveryMethod === "pickup_delivery"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => onDeliveryMethodChange("pickup_delivery")}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <MapPin className="w-12 h-12 text-purple-600" />
              <h3 className="text-lg font-semibold">Pickup & Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Pick up from another location and deliver to customer
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
            disabled={!deliveryMethod}
            className="ml-auto"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
