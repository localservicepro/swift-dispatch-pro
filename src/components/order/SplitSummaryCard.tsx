
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Truck, Calendar, Clock, Minus, Plus, ChevronDown, ChevronUp, MapPin, FileText } from "lucide-react";
import { useState } from "react";
import { CartItem, SplitConfig, Customer } from "./types";
import { TruckTypeSelector } from "./TruckTypeSelector";
import { SpecificTruckSelector } from "./SpecificTruckSelector";
import { DriverSelector } from "./DriverSelector";

interface SplitSummaryCardProps {
  split: SplitConfig;
  splitIndex: number;
  cart: CartItem[];
  customer?: Customer;
  useGlobalDeliveryAddress?: boolean;
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  onUpdateQuantity: (splitIndex: number, productId: string, quantity: number) => void;
  onRemoveProduct: (splitIndex: number, productId: string) => void;
  isCommonDateMode?: boolean;
}

export function SplitSummaryCard({ 
  split, 
  splitIndex, 
  cart, 
  customer,
  useGlobalDeliveryAddress = false,
  onUpdateSplit, 
  onUpdateQuantity, 
  onRemoveProduct,
  isCommonDateMode = false
}: SplitSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const splitTotal = split.products.reduce((sum, splitProduct) => {
    const cartItem = cart.find(item => item.product.id === splitProduct.productId);
    return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
  }, 0);

  const totalItems = split.products.reduce((sum, p) => sum + p.quantity, 0);

  const isConfigurationComplete = split.truckType && split.truckId && split.deliveryDate && split.deliveryTime &&
    (useGlobalDeliveryAddress || split.sameAsBilling || (split.deliveryAddress && split.deliveryAddress.trim() !== ""));

  const handleTruckSelect = (truckId: string, truckDetails: any) => {
    onUpdateSplit(splitIndex, { truckId });
  };

  const handleDriverChange = (driverId: string) => {
    onUpdateSplit(splitIndex, { driverId });
  };

  const handleSameAsBillingChange = (checked: boolean) => {
    onUpdateSplit(splitIndex, { 
      sameAsBilling: checked,
      deliveryAddress: checked && customer ? customer.full_address : split.deliveryAddress
    });
  };

  const handleDeliveryAddressChange = (address: string) => {
    onUpdateSplit(splitIndex, { deliveryAddress: address });
  };

  const handleSpecialInstructionsChange = (instructions: string) => {
    onUpdateSplit(splitIndex, { specialInstructions: instructions });
  };

  return (
    <Card className={`border-l-4 ${isConfigurationComplete ? 'border-l-green-500' : 'border-l-orange-500'}`}>
      <CardHeader className="pb-2 py-3">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardTitle className="text-base flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>{split.name}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
                <Badge variant="outline" className="text-xs">${splitTotal.toFixed(2)}</Badge>
                {isConfigurationComplete && (
                  <Badge variant="default" className="text-xs bg-green-500">Complete</Badge>
                )}
              </div>
            </CardTitle>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 py-3">
              {/* Products in this split */}
              {split.products.length > 0 && (
                <div>
                  <Label className="text-xs font-medium mb-1 block">Products</Label>
                  <div className="space-y-1">
                    {split.products.map(splitProduct => {
                      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                      if (!cartItem) return null;
                      
                      return (
                        <div key={splitProduct.productId} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{cartItem.product.name}</span>
                            <div className="text-gray-500">
                              ${cartItem.unit_price.toFixed(2)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity - 1)}
                              disabled={splitProduct.quantity <= 1}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="w-2 h-2" />
                            </Button>
                            <span className="w-6 text-center text-xs">{splitProduct.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateQuantity(splitIndex, splitProduct.productId, splitProduct.quantity + 1)}
                              disabled={splitProduct.quantity >= cartItem.quantity}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-2 h-2" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveProduct(splitIndex, splitProduct.productId)}
                              className="text-red-600 hover:text-red-700 text-xs h-6 px-2"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {split.products.length === 0 && (
                <div className="text-center py-2 text-gray-500 bg-gray-50 rounded text-xs">
                  No products assigned to this split yet
                </div>
              )}

              {/* Individual Delivery Address (only show if not using global and customer exists) */}
              {!useGlobalDeliveryAddress && customer && (
                <div className="border rounded-lg p-3 bg-yellow-50">
                  <Label className="text-xs font-medium mb-2 block flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Delivery Address for {split.name}
                  </Label>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id={`same-billing-${splitIndex}`}
                      checked={split.sameAsBilling}
                      onCheckedChange={handleSameAsBillingChange}
                    />
                    <Label htmlFor={`same-billing-${splitIndex}`} className="text-xs">
                      Same as billing address
                    </Label>
                  </div>

                  {!split.sameAsBilling && (
                    <Input
                      value={split.deliveryAddress || ""}
                      onChange={(e) => handleDeliveryAddressChange(e.target.value)}
                      placeholder="Enter delivery address..."
                      className="h-7 text-xs"
                    />
                  )}

                  {split.sameAsBilling && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                      {customer.full_address}
                    </div>
                  )}
                </div>
              )}

              {/* Truck Type Selection */}
              <div>
                <TruckTypeSelector
                  selectedTruckType={split.truckType}
                  onTruckTypeChange={(truckType) => onUpdateSplit(splitIndex, { truckType, truckId: "" })}
                />
              </div>

              {/* Specific Truck Selection */}
              {split.truckType && (
                <div>
                  <SpecificTruckSelector
                    selectedTruckType={split.truckType}
                    selectedTruckId={split.truckId}
                    deliveryDate={split.deliveryDate}
                    deliveryTime={split.deliveryTime}
                    onTruckSelect={handleTruckSelect}
                  />
                </div>
              )}

              {/* Driver Selection */}
              <div>
                <DriverSelector
                  selectedDriverId={split.driverId}
                  onDriverChange={handleDriverChange}
                />
              </div>

              {/* Delivery date and time (if not in common date mode) */}
              {!isCommonDateMode && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                      <Calendar className="w-2 h-2" />
                      Delivery Date
                    </Label>
                    <Input
                      type="date"
                      value={split.deliveryDate}
                      onChange={(e) => onUpdateSplit(splitIndex, { deliveryDate: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                      <Clock className="w-2 h-2" />
                      Delivery Time
                    </Label>
                    <Input
                      type="time"
                      value={split.deliveryTime}
                      onChange={(e) => onUpdateSplit(splitIndex, { deliveryTime: e.target.value })}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}

              {isCommonDateMode && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-800">
                    Using common delivery date and time for all splits
                  </p>
                </div>
              )}

              {/* Special Instructions for Driver */}
              <div>
                <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Special Instructions for Driver
                </Label>
                <Textarea
                  value={split.specialInstructions || ""}
                  onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
                  placeholder="Any special instructions for the driver for this delivery..."
                  className="h-16 text-xs resize-none"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
