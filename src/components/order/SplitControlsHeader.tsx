
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Package } from "lucide-react";

interface SplitControlsHeaderProps {
  numberOfSplits: number;
  onNumberOfSplitsChange: (count: number) => void;
  useSameDateForAll: boolean;
  onSameDateToggle: (checked: boolean) => void;
  onAddProduct: () => void;
}

export function SplitControlsHeader({
  numberOfSplits,
  onNumberOfSplitsChange,
  useSameDateForAll,
  onSameDateToggle,
  onAddProduct
}: SplitControlsHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
      {/* Number of Splits */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Splits:</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNumberOfSplitsChange(Math.max(2, numberOfSplits - 1))}
            disabled={numberOfSplits <= 2}
            className="h-7 w-7 p-0"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-sm font-medium w-4 text-center">{numberOfSplits}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNumberOfSplitsChange(Math.min(5, numberOfSplits + 1))}
            disabled={numberOfSplits >= 5}
            className="h-7 w-7 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Common Date/Address Toggle */}
      <div className="flex flex-col items-start">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="same-date"
            checked={useSameDateForAll}
            onCheckedChange={onSameDateToggle}
          />
          <Label htmlFor="same-date" className="text-sm">Same date, time &amp; address for all</Label>
        </div>
        <p className="text-[11px] text-muted-foreground ml-6">
          Turn on to set one date, time and address for every split.
        </p>
      </div>

      {/* Add Product Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddProduct}
        className="text-blue-600 border-blue-300 hover:bg-blue-100"
      >
        <Package className="w-3 h-3 mr-1" />
        Add Product
      </Button>
    </div>
  );
}
