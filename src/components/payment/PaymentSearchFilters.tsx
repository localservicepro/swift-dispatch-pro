
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";

interface PaymentSearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    status: string;
    dateRange: string;
    amountRange: string;
    paymentMethod: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export function PaymentSearchFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount
}: PaymentSearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by order number, customer name, email, phone, or payment method..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Payment Status
            </label>
            <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Date Range
            </label>
            <Select value={filters.dateRange} onValueChange={(value) => onFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Amount Range
            </label>
            <Select value={filters.amountRange} onValueChange={(value) => onFilterChange('amountRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Amounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="under-100">Under $100</SelectItem>
                <SelectItem value="100-500">$100 - $500</SelectItem>
                <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                <SelectItem value="over-1000">Over $1,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Payment Method
            </label>
            <Select value={filters.paymentMethod} onValueChange={(value) => onFilterChange('paymentMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="card">Card on File</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <button onClick={() => onFilterChange('status', 'all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.dateRange !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {filters.dateRange}
              <button onClick={() => onFilterChange('dateRange', 'all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.amountRange !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Amount: {filters.amountRange}
              <button onClick={() => onFilterChange('amountRange', 'all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.paymentMethod !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Method: {filters.paymentMethod}
              <button onClick={() => onFilterChange('paymentMethod', 'all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
