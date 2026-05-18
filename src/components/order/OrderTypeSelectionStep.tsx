
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Split } from "lucide-react";

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
  const handleSelect = (type: "single" | "split") => {
    onOrderTypeChange(type);
    setTimeout(onNext, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Split className="w-5 h-5" />
          Step 4: Order Type Selection
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose whether to create a single order or split into multiple orders for different trucks/drivers.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect("single")}
            className={`flex items-start space-x-3 rounded-lg border p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              orderType === "single" ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">Single Order</span>
              </div>
              <p className="text-sm text-gray-600">
                Create one order with all products assigned to a single truck and driver.
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelect("split")}
            className={`flex items-start space-x-3 rounded-lg border p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              orderType === "split" ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Split className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">Split Order</span>
              </div>
              <p className="text-sm text-gray-600">
                Split products into multiple orders with different trucks, drivers, or delivery times.
              </p>
            </div>
          </button>
        </div>

        <div className="flex pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
