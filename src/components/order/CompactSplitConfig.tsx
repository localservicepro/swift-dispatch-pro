import { useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, Clock, MapPin, FileText, CheckCircle, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartItem, SplitConfig, Customer } from "./types";
import { generateTimeSlots } from "@/utils/timeSlotUtils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { SuburbSelector } from "../order/SuburbSelector";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";
import { createAddressSelectHandler } from "@/utils/addressUtils";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";
import { Skeleton } from "@/components/ui/skeleton";

interface CompactSplitConfigProps {
  splits: SplitConfig[];
  cart: CartItem[];
  customer?: Customer;
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  onSplitsChange?: (splits: SplitConfig[]) => void;
  isCommonDateTimeMode?: boolean;
  isCommonAddressMode?: boolean;
  isPickup?: boolean;
}

export function CompactSplitConfig({
  splits,
  cart,
  customer,
  onUpdateSplit,
  onSplitsChange,
  isCommonDateTimeMode = false,
  isCommonAddressMode = false,
  isPickup = false
}: CompactSplitConfigProps) {
  const timeSlots = generateTimeSlots();
  const { handleAutoSuburbSelection } = useSuburbManagement();
  const { fetchSuburbData, parseDeliveryRate } = useDeliveryFeeCalculation();

  const getSplitTotal = (split: SplitConfig) => {
    return split.products.reduce((sum, splitProduct) => {
      const cartItem = cart.find(item => item.product.id === splitProduct.productId);
      return sum + (cartItem ? cartItem.unit_price * splitProduct.quantity : 0);
    }, 0);
  };

  const getSplitItemCount = (split: SplitConfig) => {
    return split.products.reduce((sum, p) => sum + p.quantity, 0);
  };

  const isSplitConfigComplete = (split: SplitConfig) => {
    const hasDeliveryInfo = split.deliveryDate && split.deliveryTime && split.products.length > 0;
    if (isPickup) return hasDeliveryInfo;
    const hasAddressInfo = split.sameAsBilling || (split.deliveryAddress && (split.suburbId || split.deliverySuburbId));
    return hasDeliveryInfo && hasAddressInfo;
  };

  const handleDateSelect = (splitIndex: number, date: Date | undefined) => {
    if (date) {
      onUpdateSplit(splitIndex, { deliveryDate: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleAddressSelect = (splitIndex: number, addressData: any) => {
    onUpdateSplit(splitIndex, { deliveryAddress: addressData.fullAddress });
    
    // Pass full address to find suburb by name first, then fall back to postcode
    handleAutoSuburbSelection(addressData.fullAddress, (suburbId: string) => {
      onUpdateSplit(splitIndex, { deliverySuburbId: suburbId });
    });
  };

  const handleSuburbChange = async (splitIndex: number, suburbId: string) => {
    onUpdateSplit(splitIndex, { deliverySuburbId: suburbId });
    
    // Fetch suburb data and calculate delivery fee
    const suburbData = await fetchSuburbData(suburbId);
    if (suburbData) {
      const deliveryFee = parseDeliveryRate(suburbData.delivery_rate);
      onUpdateSplit(splitIndex, { deliveryFee });
    }
  };

  // Auto-calculation of split delivery fees is handled in MultiStepOrderForm
  // so fees populate even before the user visits the Delivery Details tab.


  return (
    <div className="space-y-3">
      <Accordion type="multiple" defaultValue={splits.map((_, i) => i.toString())} className="space-y-2">
        {splits.map((split, index) => (
          <AccordionItem key={split.id} value={index.toString()} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full mr-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{split.name}</span>
                  {!isPickup && !split.sameAsBilling && split.deliveryAddress && (
                    <Badge variant="default" className="text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      Custom Address
                    </Badge>
                  )}
                  {isSplitConfigComplete(split) && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getSplitItemCount(split)} items
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    ${getSplitTotal(split).toFixed(2)}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Product Summary */}
                {split.products.length > 0 && (
                  <div className="bg-gray-50 rounded p-3">
                    <Label className="text-xs font-medium mb-2 block">Products in this split:</Label>
                    <div className="space-y-1">
                      {split.products.map(splitProduct => {
                        const cartItem = cart.find(item => item.product.id === splitProduct.productId);
                        if (!cartItem) return null;
                        
                        return (
                          <div key={splitProduct.productId} className="flex justify-between text-xs">
                            <span>{cartItem.product.name}</span>
                            <span className="font-medium">{splitProduct.quantity}x</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Delivery Details */}
                {!isCommonDateMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        Delivery Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-8 text-xs",
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
                            selected={split.deliveryDate ? new Date(split.deliveryDate) : undefined}
                            onSelect={(date) => handleDateSelect(index, date)}
                            disabled={isDateBeforeToday}
                            initialFocus
                            className="rounded-md border pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Delivery Time
                      </Label>
                      <Select 
                        value={split.deliveryTime} 
                        onValueChange={(time) => onUpdateSplit(index, { deliveryTime: time })}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
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

                {/* Delivery Address — hidden for pickup or when common mode is on */}
                {!isPickup && customer && !isCommonDateMode && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Delivery Address
                      </Label>
                      
                      <div className="flex items-center gap-2">
                        {index > 0 && onSplitsChange && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              const first = splits[0];
                              const updated = splits.map((s, i) =>
                                i === index
                                  ? {
                                      ...s,
                                      deliveryDate: first.deliveryDate,
                                      deliveryTime: first.deliveryTime,
                                      sameAsBilling: first.sameAsBilling,
                                      deliveryAddress: first.deliveryAddress,
                                      deliverySuburbId: first.deliverySuburbId,
                                      suburbId: first.suburbId,
                                      deliveryFee: first.deliveryFee,
                                    }
                                  : s
                              );
                              onSplitsChange(updated);
                            }}
                          >
                            Copy from {splits[0].name}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant={split.sameAsBilling ? "outline" : "default"}
                          size="sm"
                          onClick={() => onUpdateSplit(index, { 
                            sameAsBilling: !split.sameAsBilling,
                            deliveryAddress: !split.sameAsBilling ? customer.full_address : split.deliveryAddress,
                            deliverySuburbId: !split.sameAsBilling ? customer.suburb_id : split.deliverySuburbId
                          })}
                          className="h-8 text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {split.sameAsBilling ? "Use Different Address" : "Use Billing Address"}
                        </Button>
                      </div>
                    </div>
                    
                    {split.sameAsBilling ? (
                      <div className="p-3 bg-muted/50 rounded-md border border-border">
                        <p className="text-sm text-muted-foreground">
                          Using billing address: <span className="font-medium text-foreground">{customer.full_address}</span>
                        </p>
                        {customer.suburb && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {customer.suburb.name}, {customer.suburb.state}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-primary/5 rounded-md border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="text-xs">
                            Custom Delivery Address
                          </Badge>
                        </div>
                        
                        <EnhancedAddressInput
                          value={split.deliveryAddress || ""}
                          onChange={(value) => onUpdateSplit(index, { deliveryAddress: value })}
                          onAddressSelect={(addressData) => handleAddressSelect(index, addressData)}
                          placeholder="Search for delivery address..."
                          className="text-xs"
                        />
                        
                        <SuburbSelector
                          selectedSuburbId={split.deliverySuburbId || ""}
                          onSuburbChange={(suburbId) => handleSuburbChange(index, suburbId)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Common-mode read-only address summary */}
                {!isPickup && customer && isCommonDateMode && (
                  <div className="p-2 bg-muted/40 rounded-md border border-dashed border-border text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Using common address:{" "}
                    <span className="font-medium text-foreground truncate">
                      {split.sameAsBilling ? (customer.full_address || "Billing address") : (split.deliveryAddress || "—")}
                    </span>
                  </div>
                )}

                {/* Delivery Fee Display — hidden for pickup */}
                {!isPickup && (split.deliverySuburbId || (split.sameAsBilling && customer?.suburb_id)) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Delivery Fee
                      </Label>
                      <Badge variant="default" className="text-sm">
                        AU${(split.deliveryFee || 0).toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full suburb rate — charged per split (not divided)
                    </p>
                  </div>
                )}

                {/* Special Instructions */}
                <div>
                  <Label className="text-xs font-medium mb-1 block flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Special Instructions
                  </Label>
                  <Textarea
                    value={split.specialInstructions || ""}
                    onChange={(e) => onUpdateSplit(index, { specialInstructions: e.target.value })}
                    placeholder="Any special instructions for this delivery..."
                    className="h-12 text-xs resize-none"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
