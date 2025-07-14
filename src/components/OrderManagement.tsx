
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OrderManagementProvider, useOrderManagement } from "./order/OrderManagementProvider";
import { OrderManagementDialogs } from "./order/OrderManagementDialogs";
import { OrderManagementHeader } from "./order/OrderManagementHeader";
import { OrderSearchFilters, OrderSearchControls } from "./order/OrderSearchFilters";
import { OrderList } from "./order/OrderList";

function OrderManagementContent() {
  const {
    isLoading,
    error,
    filteredOrders,
    orders,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    hasActiveFilters,
    clearFilters,
    setIsCreating,
    setEditingOrder,
    setDeletingOrder,
    updateOrderStatus,
    setEditingNotes,
    refetch
  } = useOrderManagement();

  const handleNotesEdit = (order: any) => {
    setEditingNotes(order);
  };

  if (error) {
    console.error('Orders query error:', error);
    return (
      <div className="space-y-6">
        <OrderManagementHeader onCreateOrder={() => setIsCreating(true)} />
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading orders. Please try again.</p>
              <button onClick={() => refetch()} className="mt-2">Retry</button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrderManagementHeader onCreateOrder={() => setIsCreating(true)} />

      <OrderManagementDialogs />

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <OrderSearchFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            paymentStatusFilter={paymentStatusFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            ordersCount={filteredOrders.length}
            totalCount={orders.length}
          />
          
          <OrderSearchControls
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            paymentStatusFilter={paymentStatusFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
          />
        </CardHeader>
        <CardContent>
          <OrderList
            orders={filteredOrders}
            isLoading={isLoading}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onEdit={setEditingOrder}
            onDelete={setDeletingOrder}
            onStatusUpdate={updateOrderStatus}
            onNotesEdit={handleNotesEdit}
            onPaymentStatusUpdate={refetch}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function OrderManagement() {
  return (
    <OrderManagementProvider>
      <OrderManagementContent />
    </OrderManagementProvider>
  );
}
