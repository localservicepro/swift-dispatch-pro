import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Calendar as CalendarIcon, MapPin, FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import { SuburbSelector } from "@/components/order/SuburbSelector";
import { generateTimeSlots } from "@/utils/timeSlotUtils";
import { isDateBeforeToday } from "@/utils/dateTimeUtils";
import { useSuburbManagement } from "@/hooks/useSuburbManagement";
import { useDeliveryFeeCalculation } from "@/hooks/useDeliveryFeeCalculation";
import type { Customer, SplitConfig } from "@/components/order/types";

interface CommonProps {
  split: SplitConfig;
  splitIndex: number;
  onUpdateSplit: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  disabled?: boolean;
}

export function EditAddressPopover({
  split,
  splitIndex,
  onUpdateSplit,
  customer,
  disabled,
}: CommonProps & { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const { handleAutoSuburbSelection } = useSuburbManagement();
  const { fetchSuburbData, computeFeeFromRate } = useDeliveryFeeCalculation();

  const applySuburb = async (suburbId: string) => {
    onUpdateSplit(splitIndex, { deliverySuburbId: suburbId });
    if (split.deliveryFeeManual) return; // keep an explicit custom/$0 fee
    const data = await fetchSuburbData(suburbId);
    if (data) {
      // Include markup so the client value matches the server's authoritative
      // recompute; otherwise the $5 (or configured) delivery markup silently
      // disappears from split orders.
      const fee = computeFeeFromRate(data.delivery_rate);
      onUpdateSplit(splitIndex, { deliveryFee: fee, deliveryFeeManual: false });
    }
  };

  const toggleSameAsBilling = () => {
    const next = !split.sameAsBilling;
    onUpdateSplit(splitIndex, {
      sameAsBilling: next,
      deliveryAddress: next ? customer.full_address : "",
      deliverySuburbId: next ? customer.suburb_id : undefined,
    });
    if (next && customer.suburb_id && !split.deliveryFeeManual) {
      // recompute fee for billing suburb (with markup)
      fetchSuburbData(customer.suburb_id).then((data) => {
        if (data) onUpdateSplit(splitIndex, { deliveryFee: computeFeeFromRate(data.delivery_rate), deliveryFeeManual: false });
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          aria-label="Edit delivery address"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-4 bg-popover" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Delivery Address
            </Label>
            <Button
              type="button"
              size="sm"
              variant={split.sameAsBilling ? "outline" : "secondary"}
              onClick={toggleSameAsBilling}
              className="h-7 text-xs"
            >
              {split.sameAsBilling ? "Use different" : "Use billing"}
            </Button>
          </div>

          {split.sameAsBilling ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="text-foreground font-medium">{customer.full_address}</p>
              {customer.suburb && (
                <p className="text-muted-foreground mt-1">
                  {customer.suburb.name}, {customer.suburb.state}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <EnhancedAddressInput
                value={split.deliveryAddress || ""}
                onChange={(v) => onUpdateSplit(splitIndex, { deliveryAddress: v })}
                onAddressSelect={(addressData: any) => {
                  onUpdateSplit(splitIndex, { deliveryAddress: addressData.fullAddress });
                  handleAutoSuburbSelection(addressData.fullAddress, (suburbId: string) => {
                    applySuburb(suburbId);
                  });
                }}
                placeholder="Search delivery address..."
                className="text-xs"
              />
              <SuburbSelector
                selectedSuburbId={split.deliverySuburbId || ""}
                onSuburbChange={(suburbId) => applySuburb(suburbId)}
              />
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EditSchedulePopover({ split, splitIndex, onUpdateSplit, disabled }: CommonProps) {
  const [open, setOpen] = useState(false);
  const timeSlots = generateTimeSlots();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          aria-label="Edit delivery date and time"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 bg-popover" align="end">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
              <CalendarIcon className="h-3.5 w-3.5" /> Delivery Date
            </Label>
            <Calendar
              mode="single"
              selected={split.deliveryDate ? new Date(split.deliveryDate) : undefined}
              onSelect={(d) => d && onUpdateSplit(splitIndex, { deliveryDate: format(d, "yyyy-MM-dd") })}
              disabled={isDateBeforeToday}
              initialFocus
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1 block">Delivery Time</Label>
            <Select
              value={split.deliveryTime}
              onValueChange={(t) => onUpdateSplit(splitIndex, { deliveryTime: t })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EditInstructionsPopover({ split, splitIndex, onUpdateSplit, disabled }: CommonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(split.specialInstructions || "");

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(split.specialInstructions || "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          aria-label="Edit special instructions"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4 bg-popover" align="end">
        <div className="space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Special Instructions
          </Label>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Notes for this delivery..."
            className="min-h-[90px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onUpdateSplit(splitIndex, { specialInstructions: draft });
                setOpen(false);
              }}
              className="h-7 text-xs"
            >
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SplitAddressBadge({
  split,
  customer,
}: {
  split: SplitConfig;
  customer: Customer;
}) {
  if (split.sameAsBilling) {
    return (
      <Badge variant="outline" className="text-[10px] font-medium">
        Same as billing
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] font-medium">
      Custom address
    </Badge>
  );
}

export function EditDeliveryFeePopover({
  split,
  splitIndex,
  onUpdateSplit,
  customer,
  disabled,
}: CommonProps & { customer?: Customer }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(split.deliveryFee ?? 0));
  const { fetchSuburbData, computeFeeFromRate } = useDeliveryFeeCalculation();

  const suburbId = split.deliverySuburbId || (split.sameAsBilling ? customer?.suburb_id : undefined);

  const save = () => {
    const n = parseFloat(draft);
    const parsed = isNaN(n) ? 0 : Math.max(0, n);
    onUpdateSplit(splitIndex, { deliveryFee: parsed, deliveryFeeManual: true });
    setOpen(false);
  };

  const reset = async () => {
    if (!suburbId) return;
    const data = await fetchSuburbData(suburbId);
    if (data) {
      const fee = computeFeeFromRate(data.delivery_rate);
      onUpdateSplit(splitIndex, { deliveryFee: fee, deliveryFeeManual: false });
      setDraft(String(fee));
    }
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(String(split.deliveryFee ?? 0));
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 px-2 gap-1.5 text-xs font-semibold whitespace-nowrap"
          aria-label="Edit delivery fee"
        >
          <Truck className="h-3.5 w-3.5" />
          Delivery: AU${(split.deliveryFee || 0).toFixed(2)}
          {split.deliveryFeeManual && (
            <span className="text-[10px] font-medium text-muted-foreground">(Custom)</span>
          )}
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4 bg-popover" align="end">
        <div className="space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> Delivery Fee — {split.name}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">AU$</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              className="h-8 text-sm text-right"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {suburbId
              ? "Overrides the suburb rate for this split. Use 0 for free delivery."
              : "No suburb rate available — the amount you enter is used as-is. Use 0 for free delivery."}
          </p>
          <div className="flex justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={!suburbId}
              className="h-7 text-xs"
            >
              Reset to suburb rate
            </Button>
            <Button size="sm" onClick={save} className="h-7 text-xs">
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
