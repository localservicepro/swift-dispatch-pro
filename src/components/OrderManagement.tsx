
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "./auth/AuthProvider";
import { useOrdersQuery } from "./order/hooks/useOrdersQuery";
import { OrderFilters } from "./order/OrderFilters";
import { OrderCard } from "./order/OrderCard";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address: string;
  products: any;
  total_amount: number;
  status: OrderStatus;
  driver_id?: string;
  created_at: string;
  delivery_date?: string;
  delivery_time?: string;
  special_instructions?: string;
  customer_id?: string;
  suburb_id?: string;
  delivery_fee?: number;
  subtotal?: number;
}

export function OrderManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { profile } = useAuth();

  // Use our custom hook for orders data
  const { orders, isLoading, error, refetch } = useOrdersQuery();

  // Filter orders based on search query and status
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchQuery, statusFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  const handleOrderCreated = () => {
    // Refresh orders list from database
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
  };

  const handleOrderUpdated = () => {
    // Refresh orders list from database
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!",
    });
  };

  // Simplified order status update function without activity logging
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, currentOrder: Order) => {
    try {
      console.log(`Updating order ${orderId} status to ${newStatus}`);
      
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Order status update failed:', updateError);
        throw updateError;
      }

      console.log(`Order ${orderId} status successfully updated to ${newStatus}`);

      // Show user feedback immediately
      toast({
        title: "Status Updated",
        description: `Order ${currentOrder.order_number} status updated to ${newStatus.replace('_', ' ')}`,
      });

      // Refresh orders immediately
      refetch();

    } catch (error: any) {
      console.error('Order status update failed:', error);
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  if (error) {
    console.error('Orders query error:', error);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
            <p className="text-slate-600 mt-1">Create and manage customer orders</p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Create New Order
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading orders. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-2">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
          <p className="text-slate-600 mt-1">Create and manage customer orders • Real-time updates enabled</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          Create New Order
        </Button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                >
                  Close
                </Button>
              </div>
              <MultiStepOrderForm
                onOrderCreated={handleOrderCreated}
                onClose={() => setIsCreating(false)}
              />
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <OrderEditDialog
          order={editingOrder}
          onOrderUpdated={handleOrderUpdated}
          onClose={() => setEditingOrder(null)}
        />
      )}

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Recent Orders 
              {isLoading && <span className="text-sm font-normal text-slate-500">(Loading...)</span>}
              {!isLoading && (
                <span className="text-sm font-normal text-slate-500">
                  ({filteredOrders.length} of {orders.length} orders)
                </span>
              )}
            </CardTitle>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="mt-4">
            <OrderFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {hasActiveFilters ? (
                <div>
                  <p>No orders match your current filters.</p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <p>No orders found. Create your first order to get started!</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onEdit={setEditingOrder}
                  onStatusUpdate={updateOrderStatus}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
