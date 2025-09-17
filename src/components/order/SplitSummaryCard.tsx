import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Clock, Minus, Plus, ChevronDown, ChevronUp, MapPin, FileText, RotateCcw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CartItem, SplitConfig, Customer, Product } from "./types";
import { ProductReplacementDialog } from "./ProductReplacementDialog";
import { generateTimeSlots } from "@/utils/timeSlotUtils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { SuburbSelector } from "../order/SuburbSelector";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";
import { createAddressSelectHandler } from "@/utils/addressUtils";

interface SplitSummaryCardProps {
  split: SplitConfig;
  splitIndex: number;
  cart: CartItem[];
  customer?: Customer;
  useGlobalDeliveryAddress?: boolean;
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  onUpdateQuantity: (splitIndex: number, productId: string, quantity: number) => void;
  onRemoveProduct: (splitIndex: number, productId: string) => void;
  onReplaceProduct?: (splitIndex: number, currentProductId: string, newProduct: Product, quantity: number) => void;
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
  onReplaceProduct,
  isCommonDateMode = false
}: SplitSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [replacementDialog, setReplacementDialog] = useState<{
    isOpen: boolean;
    product: CartItem | null;
  }>({
    isOpen: false,
    product: null
  });
  
  const timeSlots = generateTimeSlots();
  const { handleAutoSuburbSelection } = useSuburbManagement();

  // Convert string date to Date object for calendar
  const selectedDate = split.deliveryDate ? new Date(split.deliveryDate) : undefined;

  const splitTotal = split.products.reduce((sum, splitProduct) => {
    const cartItem = cart.find(item => item.product.id === splitProduct.productId);
    return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
  }, 0);

  const totalItems = split.products.reduce((sum, p) => sum + p.quantity, 0);

  const isConfigurationComplete = split.deliveryDate && split.deliveryTime &&
    (useGlobalDeliveryAddress || split.sameAsBilling || 
     (split.deliveryAddress && split.deliveryAddress.trim() !== "" && (split.suburbId || split.deliverySuburbId)));

  const handleSameAsBillingChange = (checked: boolean) => {
    onUpdateSplit(splitIndex, { 
      sameAsBilling: checked,
      deliveryAddress: checked && customer ? customer.full_address : split.deliveryAddress,
      deliverySuburbId: checked && customer ? customer.suburb_id : split.deliverySuburbId
    });
  };

  const handleDeliveryAddressChange = (address: string) => {
    onUpdateSplit(splitIndex, { deliveryAddress: address });
  };

  const handleAddressSelect = (addressData: any) => {
    onUpdateSplit(splitIndex, { deliveryAddress: addressData.fullAddress });
    
    // Auto-select suburb based on postcode if available
    if (addressData.postcode) {
      handleAutoSuburbSelection(addressData.postcode, (suburbId: string) => {
        onUpdateSplit(splitIndex, { deliverySuburbId: suburbId });
      });
    }
  };

  const handleSuburbChange = (suburbId: string) => {
    onUpdateSplit(splitIndex, { deliverySuburbId: suburbId });
  };

  const handleSpecialInstructionsChange = (instructions: string) => {
    onUpdateSplit(splitIndex, { specialInstructions: instructions });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onUpdateSplit(splitIndex, { deliveryDate: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleTimeChange = (time: string) => {
    onUpdateSplit(splitIndex, { deliveryTime: time });
  };

  const handleReplaceProduct = (currentProductId: string) => {
    const cartItem = cart.find(item => item.product.id === currentProductId);
    if (cartItem) {
      setReplacementDialog({
        isOpen: true,
        product: cartItem
      });
    }
  };

  const handleProductReplacement = (splitIndex: number, currentProductId: string, newProduct: Product, quantity: number) => {
    if (onReplaceProduct) {
      onReplaceProduct(splitIndex, currentProductId, newProduct, quantity);
    }
    setReplacementDialog({ isOpen: false, product: null });
  };

  return (
    <>
      <Card className={`border-l-4 ${isConfigurationComplete ? 'border-l-green-500' : 'border-l-orange-500'}`}>
        <CardHeader className="pb-2 py-3">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <CardTitle className="text-base flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded">
                <div className="flex items-center gap-2">
                  <span>{split.name}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
                  <Badge variant="outline" className="text-xs">AU${splitTotal.toFixed(2)}</Badge>
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
                                AU${cartItem.unit_price.toFixed(2)} each
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
                                onClick={() => handleReplaceProduct(splitProduct.productId)}
                                className="text-blue-600 hover:text-blue-700 text-xs h-6 px-2"
                                title="Replace product"
                              >
                                <RotateCcw className="w-3 h-3" />
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
                      <div className="space-y-2">
                        <EnhancedAddressInput
                          value={split.deliveryAddress || ""}
                          onChange={handleDeliveryAddressChange}
                          onAddressSelect={handleAddressSelect}
                          placeholder="Enter delivery address..."
                          className="h-7 text-xs"
                        />
                        <SuburbSelector
                          selectedSuburbId={split.deliverySuburbId || ""}
                          onSuburbChange={handleSuburbChange}
                        />
                      </div>
                    )}

                    {split.sameAsBilling && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                        {customer.full_address}
                        {customer.suburb && (
                          <div className="text-gray-500 mt-1">
                            {customer.suburb.name}, {customer.suburb.state}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery date and time (if not in common date mode) */}
                {!isCommonDateMode && (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Delivery Date */}
                    <div>
                      <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                        <CalendarIcon className="w-2 h-2" />
                        Delivery Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-7 text-xs",
                              !split.deliveryDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {split.deliveryDate ? format(new Date(split.deliveryDate), 'MMM dd') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={isDateBeforeToday}
                            initialFocus
                            className="rounded-md border pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Delivery Time */}
                    <div>
                      <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                        <Clock className="w-2 h-2" />
                        Delivery Time
                      </Label>
                      <Select value={split.deliveryTime} onValueChange={handleTimeChange}>
                        <SelectTrigger className="w-full h-7 text-xs">
                          <Clock className="mr-2 h-3 w-3" />
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

      {/* Product Replacement Dialog */}
      {replacementDialog.product && (
        <ProductReplacementDialog
          isOpen={replacementDialog.isOpen}
          onClose={() => setReplacementDialog({ isOpen: false, product: null })}
          currentProduct={replacementDialog.product}
          splitIndex={splitIndex}
          splitName={split.name}
          onReplace={handleProductReplacement}
        />
      )}
    </>
  );
}
