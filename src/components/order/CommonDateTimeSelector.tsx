
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, MapPin, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";
import { TimeSlotSelector } from "./TimeSlotSelector";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { SuburbSelector } from "./SuburbSelector";
import { Customer } from "./types";

interface CommonDateTimeSelectorProps {
  commonDeliveryDate: string;
  commonDeliveryTime: string;
  onDateSelect: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  // Address (optional — only used for delivery, not pickup)
  customer?: Customer;
  isPickup?: boolean;
  commonSameAsBilling?: boolean;
  commonDeliveryAddress?: string;
  commonDeliverySuburbId?: string;
  onSameAsBillingToggle?: (sameAsBilling: boolean) => void;
  onAddressChange?: (address: string) => void;
  onAddressSelect?: (addressData: any) => void;
  onSuburbChange?: (suburbId: string) => void;
}

export function CommonDateTimeSelector({
  commonDeliveryDate,
  commonDeliveryTime,
  onDateSelect,
  onTimeChange,
  customer,
  isPickup = false,
  commonSameAsBilling = true,
  commonDeliveryAddress = "",
  commonDeliverySuburbId = "",
  onSameAsBillingToggle,
  onAddressChange,
  onAddressSelect,
  onSuburbChange,
}: CommonDateTimeSelectorProps) {
  const selectedCommonDate = commonDeliveryDate ? new Date(commonDeliveryDate) : undefined;
  const showAddress = !isPickup && !!customer && !!onSameAsBillingToggle;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1 block">Common Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-8 text-xs",
                  !commonDeliveryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {commonDeliveryDate ? format(new Date(commonDeliveryDate), 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={selectedCommonDate}
                onSelect={onDateSelect}
                disabled={isDateBeforeToday}
                initialFocus
                className="rounded-md border pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Common Time</Label>
          <TimeSlotSelector
            value={commonDeliveryTime}
            onValueChange={onTimeChange}
            placeholder="Select time..."
            triggerClassName="h-8 text-xs"
          />
        </div>
      </div>

      {showAddress && (
        <div className="space-y-2 pt-2 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Common Delivery Address
            </Label>
            <Button
              type="button"
              variant={commonSameAsBilling ? "outline" : "default"}
              size="sm"
              onClick={() => onSameAsBillingToggle?.(!commonSameAsBilling)}
              className="h-7 text-xs"
            >
              {commonSameAsBilling ? "Use Different Address" : "Use Billing Address"}
            </Button>
          </div>

          {commonSameAsBilling ? (
            <div className="p-2 bg-white/60 rounded border border-blue-200">
              <p className="text-xs text-muted-foreground">
                Using billing address:{" "}
                <span className="font-medium text-foreground">
                  {customer?.full_address || "—"}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-2 bg-white/60 rounded border border-blue-200">
              <EnhancedAddressInput
                value={commonDeliveryAddress}
                onChange={(value) => onAddressChange?.(value)}
                onAddressSelect={(addressData) => onAddressSelect?.(addressData)}
                placeholder="Search for delivery address..."
                className="text-xs"
              />
              <SuburbSelector
                selectedSuburbId={commonDeliverySuburbId}
                onSuburbChange={(suburbId) => onSuburbChange?.(suburbId)}
              />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Delivery fee applies per split (not divided) — each split is charged the full suburb rate.
          </p>
        </div>
      )}
    </div>
  );
}
