
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X, Home, Wrench, Building2, User } from "lucide-react";

interface CustomerFiltersProps {
  searchTerm: string;
  customerTypeFilter: string;
  entityTypeFilter: string;
  statusFilter: string;
  activeFilterCount: number;
  onSearchChange: (value: string) => void;
  onCustomerTypeChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  totalCustomers: number;
  filteredCount: number;
}

export function CustomerFilters({
  searchTerm,
  customerTypeFilter,
  entityTypeFilter,
  statusFilter,
  activeFilterCount,
  onSearchChange,
  onCustomerTypeChange,
  onEntityTypeChange,
  onStatusChange,
  onClearFilters,
  totalCustomers,
  filteredCount
}: CustomerFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5" />
          Search & Filter Customers
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, email, company, or suburb..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => onSearchChange("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Customer Type</label>
            <Select value={customerTypeFilter} onValueChange={onCustomerTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="residential">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-green-600" />
                    Residential
                  </div>
                </SelectItem>
                <SelectItem value="trade">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-600" />
                    Trade
                  </div>
                </SelectItem>
                <SelectItem value="account">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Account
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Entity Type</label>
            <Select value={entityTypeFilter} onValueChange={onEntityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="individual">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Individual
                  </div>
                </SelectItem>
                <SelectItem value="business">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Business
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 opacity-0">Actions</label>
            <Button
              variant="outline"
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
              className="w-full flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600 border-t pt-4">
          <span>
            Showing {filteredCount} of {totalCustomers} customers
          </span>
          {activeFilterCount > 0 && (
            <span className="text-blue-600">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
