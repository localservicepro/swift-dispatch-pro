
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar as CalendarIcon, Clock, MapPin, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartItem, SplitConfig, Customer } from "./types";

interface CompactSplitConfigProps {
  splits: SplitConfig[];
  cart: CartItem[];
  customer?: Customer;
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  isCommonDateMode?: boolean;
}

const generateTimeSlots = () => {
  const timeSlots = [];
  for (let hour = 8; hour <= 16; hour++) {
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });
    timeSlots.push({ value: time24, label: time12 });
  }
  return timeSlots;
};

export function CompactSplitConfig({ 
  splits, 
  cart, 
  customer,
  onUpdateSplit,
  isCommonDateMode = false
}: CompactSplitConfigProps) {
  const timeSlots = generateTimeSlots();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

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
    return split.deliveryDate && split.deliveryTime && split.products.length > 0;
  };

  const handleDateSelect = (splitIndex: number, date: Date | undefined) => {
    if (date) {
      onUpdateSplit(splitIndex, { deliveryDate: format(date, 'yyyy-MM-dd') });
    }
  };

  return (
    <div className="space-y-3">
      <Accordion type="multiple" defaultValue={splits.map((_, i) => i.toString())} className="space-y-2">
        {splits.map((split, index) => (
          <AccordionItem key={split.id} value={index.toString()} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full mr-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{split.name}</span>
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
                            disabled={(date) => date < tomorrow}
                            initialFocus
                            className="rounded-md border"
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

                {/* Delivery Address */}
                {customer && (
                  <div>
                    <Label className="text-xs font-medium mb-2 block flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Delivery Address
                    </Label>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`same-billing-${index}`}
                        checked={split.sameAsBilling}
                        onCheckedChange={(checked) => onUpdateSplit(index, { 
                          sameAsBilling: checked as boolean,
                          deliveryAddress: checked ? customer.full_address : split.deliveryAddress
                        })}
                      />
                      <Label htmlFor={`same-billing-${index}`} className="text-xs">
                        Same as billing address
                      </Label>
                    </div>

                    {split.sameAsBilling ? (
                      <div className="text-xs bg-gray-50 p-2 rounded border">
                        {customer.full_address}
                      </div>
                    ) : (
                      <Textarea
                        value={split.deliveryAddress || ""}
                        onChange={(e) => onUpdateSplit(index, { deliveryAddress: e.target.value })}
                        placeholder="Enter delivery address..."
                        className="h-16 text-xs resize-none"
                      />
                    )}
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
