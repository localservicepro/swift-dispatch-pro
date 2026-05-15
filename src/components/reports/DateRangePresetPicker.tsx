import { useState } from "react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRangePreset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

export function getPresetRange(preset: DateRangePreset, fallback?: DateRange): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now), preset };
    case "last7":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), preset };
    case "last30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), preset };
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfDay(now), preset };
    case "lastMonth": {
      const lm = subMonths(now, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm), preset };
    }
    case "custom":
      return fallback ?? { start: startOfDay(subDays(now, 29)), end: endOfDay(now), preset: "custom" };
  }
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom" },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePresetPicker({ value, onChange }: Props) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handlePreset = (preset: DateRangePreset) => {
    if (preset === "custom") {
      onChange({ ...value, preset: "custom" });
    } else {
      onChange(getPresetRange(preset));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            variant={value.preset === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("min-w-[140px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(value.start, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.start}
                onSelect={(d) => {
                  if (d) {
                    onChange({ ...value, start: startOfDay(d), preset: "custom" });
                    setStartOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">to</span>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("min-w-[140px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(value.end, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.end}
                onSelect={(d) => {
                  if (d) {
                    onChange({ ...value, end: endOfDay(d), preset: "custom" });
                    setEndOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
