import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export function useCustomerFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const getActiveFilterCount = () => {
    let count = 0;
    if (customerTypeFilter !== "all") count++;
    if (entityTypeFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (searchTerm.trim()) count++;
    return count;
  };

  const clearAllFilters = () => {
    setCustomerTypeFilter("all");
    setEntityTypeFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return {
    searchTerm,
    debouncedSearchTerm,
    customerTypeFilter,
    entityTypeFilter,
    statusFilter,
    activeFilterCount: getActiveFilterCount(),
    setSearchTerm,
    setCustomerTypeFilter,
    setEntityTypeFilter,
    setStatusFilter,
    clearAllFilters,
  };
}
