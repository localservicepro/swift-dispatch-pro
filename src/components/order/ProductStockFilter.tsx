import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

interface ProductStockFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductStockFilter({ value, onChange }: ProductStockFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <SelectValue placeholder="Stock Status" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Products</SelectItem>
        <SelectItem value="in_stock">In Stock Only</SelectItem>
        <SelectItem value="low_stock">Low Stock</SelectItem>
        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
        <SelectItem value="backorder">Backorder</SelectItem>
      </SelectContent>
    </Select>
  );
}