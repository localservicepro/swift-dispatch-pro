
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TruckTypeSelector } from "./TruckTypeSelector";
import { SpecificTruckSelector } from "./SpecificTruckSelector";
import { DriverSelector } from "./DriverSelector";
import { Database } from "@/integrations/supabase/types";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";
import { Truck, User, Calendar, Clock, MapPin } from "lucide-react";

type TruckType = Database["public"]["Enums"]["truck_type"];

interface AssignmentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address: string;
  delivery_date: string;
  delivery_time: string;
  total_amount: number;
}

interface TruckDriverAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: AssignmentOrder | null;
  onAssignmentComplete: (assignments: {
    truckType: TruckType;
    truckId: string;
    driverId: string;
  }) => void;
}

export function TruckDriverAssignmentDialog({
  isOpen,
  onClose,
  order,
  onAssignmentComplete
}: TruckDriverAssignmentDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTruckType, setSelectedTruckType] = useState<TruckType | "">("");
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("unassigned");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setCurrentStep(1);
    setSelectedTruckType("");
    setSelectedTruckId("");
    setSelectedDriverId("unassigned");
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTruckTypeSelect = (truckType: TruckType) => {
    setSelectedTruckType(truckType);
    setSelectedTruckId(""); // Reset truck selection when type changes
    setCurrentStep(2);
  };

  const handleTruckSelect = (truckId: string) => {
    setSelectedTruckId(truckId);
    setCurrentStep(3);
  };

  const handleDriverSelect = (driverId: string) => {
    setSelectedDriverId(driverId);
  };

  const handleComplete = async () => {
    if (!selectedTruckType || !selectedTruckId) {
      toast({
        title: "Incomplete Assignment",
        description: "Please select both truck type and specific truck",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onAssignmentComplete({
        truckType: selectedTruckType,
        truckId: selectedTruckId,
        driverId: selectedDriverId
      });
      
      toast({
        title: "Assignment Complete",
        description: `Order ${order?.order_number} assigned and moved to loading stage`,
      });
      
      handleClose();
    } catch (error: any) {
      console.error('Assignment failed:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign truck and driver",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedTruckType;
      case 2: return !!selectedTruckId;
      case 3: return true; // Driver is optional
      default: return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Select Truck Type";
      case 2: return "Select Specific Truck";
      case 3: return "Assign Driver (Optional)";
      default: return "Assignment";
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Assign Truck & Driver - Order {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="truncate">{order.customer_address}</span>
                </div>
                {order.delivery_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{order.delivery_date}</span>
                  </div>
                )}
                {order.delivery_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{order.delivery_time}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total Amount:</span>
                <Badge variant="outline">${calculateDisplayTotal(order).toFixed(2)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{getStepTitle()}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 1 && (
                <TruckTypeSelector
                  selectedTruckType={selectedTruckType}
                  onTruckTypeChange={handleTruckTypeSelect}
                />
              )}

              {currentStep === 2 && selectedTruckType && (
                <SpecificTruckSelector
                  selectedTruckType={selectedTruckType}
                  selectedTruckId={selectedTruckId}
                  deliveryDate={order.delivery_date}
                  deliveryTime={order.delivery_time}
                  onTruckSelect={(truckId) => handleTruckSelect(truckId)}
                  excludeOrderId={order.id}
                />
              )}

              {currentStep === 3 && (
                <DriverSelector
                  selectedDriverId={selectedDriverId}
                  deliveryDate={order.delivery_date}
                  deliveryTime={order.delivery_time}
                  onDriverChange={handleDriverSelect}
                  excludeOrderId={order.id}
                />
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isProcessing}
              >
                Back
              </Button>
            )}

            {currentStep < 3 ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed() || isProcessing}
                className="ml-auto"
              >
                Next: {currentStep === 1 ? "Select Truck" : "Assign Driver"}
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                disabled={!selectedTruckId || isProcessing}
                className="ml-auto"
              >
                {isProcessing ? "Assigning..." : "Complete Assignment"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
