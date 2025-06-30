
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

interface OrderSearchFiltersProps {
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  ordersCount: number;
  totalCount: number;
}

export function OrderSearchFilters({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onClearFilters,
  hasActiveFilters,
  ordersCount,
  totalCount
}: OrderSearchFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-lg font-semibold text-slate-800">
        Recent Orders 
        <span className="text-sm font-normal text-slate-500 ml-2">
          ({ordersCount} of {totalCount} orders)
        </span>
      </div>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="flex items-center gap-2">
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

export function OrderSearchControls({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange
}: Pick<OrderSearchFiltersProps, 'searchQuery' | 'statusFilter' | 'onSearchChange' | 'onStatusFilterChange'>) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by order number, customer name, phone, or purchase order..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex items-center gap-2 sm:w-48">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="loading">Loading</SelectItem>
            <SelectItem value="en_route">En Route</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
