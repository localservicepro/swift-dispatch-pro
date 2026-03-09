
import { useState } from "react";
import { Check, ChevronDown, Clock, Zap, Timer, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { generateTimeSlots } from "@/utils/timeSlotUtils";

interface TimeSlotSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

const specialIcons: Record<string, React.ReactNode> = {
  urgent: <Zap className="w-3.5 h-3.5 text-destructive" />,
  asap: <Timer className="w-3.5 h-3.5 text-orange-500" />,
  anytime: <CalendarClock className="w-3.5 h-3.5 text-primary" />,
};

export function TimeSlotSelector({
  value,
  onValueChange,
  placeholder = "Select time...",
  className,
  triggerClassName,
}: TimeSlotSelectorProps) {
  const [open, setOpen] = useState(false);
  const timeSlots = generateTimeSlots();
  const prioritySlots = timeSlots.filter(s => s.group === 'priority');
  const thirtyMinSlots = timeSlots.filter(s => s.group === '30min');
  const oneHourSlots = timeSlots.filter(s => s.group === '1hour');

  const selectedSlot = timeSlots.find(s => s.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-background",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value && specialIcons[value] ? specialIcons[value] : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
            {selectedSlot ? selectedSlot.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0 w-[--radix-popover-trigger-width] pointer-events-auto", className)} align="start" onWheel={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Search time..." />
          <CommandList>
            <CommandEmpty>No time slot found.</CommandEmpty>
            <CommandGroup heading="Priority">
              {prioritySlots.map((slot) => (
                <CommandItem
                  key={slot.value}
                  value={slot.label}
                  onSelect={() => { onValueChange(slot.value); setOpen(false); }}
                  className="flex items-center gap-2 py-2"
                >
                  {specialIcons[slot.value]}
                  <span className="font-medium">{slot.label}</span>
                  <Check className={cn("ml-auto h-4 w-4", value === slot.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="30-Minute Windows">
              {thirtyMinSlots.map((slot) => (
                <CommandItem
                  key={slot.value}
                  value={slot.label}
                  onSelect={() => { onValueChange(slot.value); setOpen(false); }}
                  className="flex items-center gap-2 py-2"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{slot.label}</span>
                  <Check className={cn("ml-auto h-4 w-4", value === slot.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="1-Hour Windows">
              {oneHourSlots.map((slot) => (
                <CommandItem
                  key={slot.value}
                  value={slot.label}
                  onSelect={() => { onValueChange(slot.value); setOpen(false); }}
                  className="flex items-center gap-2 py-2"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{slot.label}</span>
                  <Check className={cn("ml-auto h-4 w-4", value === slot.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
