
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Split, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrderTypeSelectionStepProps {
  orderType: "single" | "split";
  onOrderTypeChange: (type: "single" | "split") => void;
  onBack: () => void;
  onNext: () => void;
}

export function OrderTypeSelectionStep({
  orderType,
  onOrderTypeChange,
  onBack,
  onNext
}: OrderTypeSelectionStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Split className="w-5 h-5" />
          Step 3: Order Type Selection
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose whether to create a single order or split into multiple orders for different trucks/drivers.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-base font-medium mb-4 block">Select Order Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Single Order Option */}
            <button
              onClick={() => onOrderTypeChange("single")}
              className={`flex items-start space-x-3 rounded-lg border p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                orderType === "single" ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    Single Order
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Create one order with all products assigned to a single truck and driver.
                </p>
              </div>
            </button>

            {/* Split Order Option */}
            <button
              onClick={() => onOrderTypeChange("split")}
              className={`flex items-start space-x-3 rounded-lg border p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                orderType === "split" ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Split className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    Split Order
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Split products into multiple orders with different trucks, drivers, or delivery times.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Information about split orders */}
        {orderType === "split" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Split orders allow you to divide products across multiple trucks and drivers. Each split will be tracked separately in the pipeline but linked to a master order for billing purposes.
            </AlertDescription>
          </Alert>
        )}

        {/* Selected order type confirmation */}
        {orderType && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-medium text-green-900">Selected Order Type</span>
            </div>
            <p className="text-sm text-green-700">
              {orderType === "single" 
                ? "Single Order - All products will be delivered together"
                : "Split Order - Products will be divided into multiple deliveries"
              }
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={onNext}
            disabled={!orderType}
            className="ml-auto"
          >
            {orderType === "split" ? "Configure Splits" : "Continue to Delivery"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
