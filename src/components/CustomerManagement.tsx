
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomerDialog } from "@/components/customer/CustomerDialog";
import { CustomerImportDialog } from "@/components/customer/CustomerImportDialog";
import { CustomerOrders } from "@/components/customer/CustomerOrders";
import { CustomerStats } from "@/components/customer/CustomerStats";
import { CustomerManagementHeader } from "@/components/customer/CustomerManagementHeader";
import { CustomerFilters } from "@/components/customer/CustomerFilters";
import { CustomerList } from "@/components/customer/CustomerList";
import { useCustomerFilters } from "@/hooks/useCustomerFilters";
import { useCustomerActions } from "@/hooks/useCustomerActions";
import { useState } from "react";

export function CustomerManagement() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          suburbs (
            id,
            name,
            state,
            postcode,
            delivery_rate
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const {
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
  } = useCustomerFilters(customers);

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
    handleDialogSuccess
  } = useCustomerActions();

  const handleImportSuccess = () => {
    refetch();
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

      <CustomerStats customers={customers || []} />

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
        totalCustomers={customers?.length || 0}
        filteredCount={filteredCustomers?.length || 0}
      />

      <CustomerList
        customers={filteredCustomers}
        isLoading={isLoading}
        error={error}
        activeFilterCount={activeFilterCount}
        onViewOrders={handleViewOrders}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onClearFilters={clearAllFilters}
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
