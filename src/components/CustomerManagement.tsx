import { CustomerDialog } from "@/components/customer/CustomerDialog";
import { CustomerImportDialog } from "@/components/customer/CustomerImportDialog";
import { CustomerOrders } from "@/components/customer/CustomerOrders";
import { CustomerStats } from "@/components/customer/CustomerStats";
import { CustomerManagementHeader } from "@/components/customer/CustomerManagementHeader";
import { CustomerFilters } from "@/components/customer/CustomerFilters";
import { CustomerList } from "@/components/customer/CustomerList";
import { useCustomerFilters } from "@/hooks/useCustomerFilters";
import { useCustomerActions } from "@/hooks/useCustomerActions";
import { useCustomersData } from "@/hooks/useCustomersData";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function CustomerManagement() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    searchTerm,
    debouncedSearchTerm,
    customerTypeFilter,
    entityTypeFilter,
    statusFilter,
    activeFilterCount,
    setSearchTerm,
    setCustomerTypeFilter,
    setEntityTypeFilter,
    setStatusFilter,
    clearAllFilters,
  } = useCustomerFilters();

  const {
    customers,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCustomersData({
    searchQuery: debouncedSearchTerm,
    customerTypeFilter,
    entityTypeFilter,
    statusFilter,
  });

  const {
    isDialogOpen,
    selectedCustomer,
    isEditMode,
    showOrders,
    setIsDialogOpen,
    setShowOrders,
    handleAddCustomer,
    handleEditCustomer,
    handleViewOrders,
    handleDeleteCustomer,
    handleDialogSuccess,
  } = useCustomerActions();

  const handleImportSuccess = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["customers-stats-counts"] });
    setIsImportDialogOpen(false);
  };

  if (showOrders && selectedCustomer) {
    return (
      <CustomerOrders
        customer={selectedCustomer}
        onBack={() => setShowOrders(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CustomerManagementHeader
        onAddCustomer={handleAddCustomer}
        onImportCustomers={() => setIsImportDialogOpen(true)}
      />

      <CustomerStats />

      <CustomerFilters
        searchTerm={searchTerm}
        customerTypeFilter={customerTypeFilter}
        entityTypeFilter={entityTypeFilter}
        statusFilter={statusFilter}
        activeFilterCount={activeFilterCount}
        onSearchChange={setSearchTerm}
        onCustomerTypeChange={setCustomerTypeFilter}
        onEntityTypeChange={setEntityTypeFilter}
        onStatusChange={setStatusFilter}
        onClearFilters={clearAllFilters}
        loadedCount={customers?.length || 0}
        hasMore={hasNextPage}
      />

      <CustomerList
        customers={customers}
        isLoading={isLoading}
        error={error}
        activeFilterCount={activeFilterCount}
        onViewOrders={handleViewOrders}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onClearFilters={clearAllFilters}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

      <CustomerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        customer={selectedCustomer}
        isEdit={isEditMode}
        onSuccess={handleDialogSuccess}
      />

      <CustomerImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
