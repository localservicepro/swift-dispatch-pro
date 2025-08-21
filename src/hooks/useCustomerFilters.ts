
import { useState, useMemo } from "react";
import { getCustomerDisplayName } from "@/components/order/services/orderFormattingService";

export function useCustomerFilters(customers: any[] = []) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCustomers = useMemo(() => {
    const filtered = customers?.filter(customer => {
      const searchText = searchTerm.toLowerCase();
      const customerName = getCustomerDisplayName(customer);
      const matchesSearch = 
        customerName.toLowerCase().includes(searchText) ||
        customer.email?.toLowerCase().includes(searchText) ||
        customer.suburbs?.name?.toLowerCase().includes(searchText) ||
        customer.company_name?.toLowerCase().includes(searchText) ||
        customer.business_name?.toLowerCase().includes(searchText);
      
      const matchesCustomerType = customerTypeFilter === "all" || customer.customer_type === customerTypeFilter;
      const matchesEntityType = entityTypeFilter === "all" || customer.entity_type === entityTypeFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && customer.is_active) || 
        (statusFilter === "inactive" && !customer.is_active);
      
      return matchesSearch && matchesCustomerType && matchesEntityType && matchesStatus;
    });

    // Sort alphabetically by display name (case-insensitive)
    return filtered?.sort((a, b) => {
      const nameA = getCustomerDisplayName(a).toLowerCase();
      const nameB = getCustomerDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [customers, searchTerm, customerTypeFilter, entityTypeFilter, statusFilter]);

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

  const activeFilterCount = getActiveFilterCount();

  return {
    searchTerm,
    customerTypeFilter,
    entityTypeFilter,
    statusFilter,
    filteredCustomers,
    activeFilterCount,
    setSearchTerm,
    setCustomerTypeFilter,
    setEntityTypeFilter,
    setStatusFilter,
    clearAllFilters
  };
}
