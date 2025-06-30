
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { Database } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import { emailService } from "@/utils/emailService";
import { EnhancedDeleteOrderDialog } from "./order/EnhancedDeleteOrderDialog";
import { NotesEditDialog } from "./notes/NotesEditDialog";
import { OrderManagementHeader } from "./order/OrderManagementHeader";
import { OrderSearchFilters, OrderSearchControls } from "./order/OrderSearchFilters";
import { OrderList } from "./order/OrderList";
import { useOrderData, useFilteredOrders } from "./order/hooks/useOrderData";
import { useOrderActions } from "./order/hooks/useOrderActions";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  order_number: string;
  purchase_order?: string;
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
  order_notes?: string;
  delivery_notes?: string;
  driver_name?: string;
  truck_registration?: string;
  truck_type_display?: string;
}

export function OrderManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use custom hooks for data and actions
  const { orders, isLoading, error, refetch } = useOrderData();
  const { updateOrderStatus, handleDeleteOrder } = useOrderActions(refetch);
  const filteredOrders = useFilteredOrders(orders, searchQuery, statusFilter);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  // Enhanced delete handler that supports both single and group deletion
  const onDeleteOrder = async (orderId: string, deleteType: 'single' | 'group') => {
    if (!deletingOrder || isDeleting) return;

    setIsDeleting(true);
    try {
      await handleDeleteOrder(orderId, deleteType, deletingOrder);
      setDeletingOrder(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Set up real-time subscription for order updates with email notifications
  useEffect(() => {
    console.log('Setting up real-time subscription for orders...');
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        console.log('Real-time order update received:', payload);

        queryClient.invalidateQueries({ queryKey: ['orders'] });

        if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            toast({
              title: "Order Status Updated",
              description: `Order ${payload.new.order_number} changed from ${oldStatus} to ${newStatus}`
            });

            try {
              const driverName = payload.new.driver_name;
              await emailService.sendOrderStatusUpdate(payload.new.id, oldStatus, newStatus, driverName);
            } catch (error) {
              console.error('Failed to send status update email:', error);
            }
          }
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          toast({
            title: "New Order Created",
            description: `Order ${payload.new.order_number} has been created`
          });
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const handleOrderCreated = () => {
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!"
    });
  };

  const handleOrderUpdated = () => {
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!"
    });
  };

  const handleNotesEdit = (order: Order) => {
    setEditingNotes(order);
  };

  const handleNotesUpdated = () => {
    refetch();
    setEditingNotes(null);
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

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <button onClick={() => setIsCreating(false)}>Close</button>
              </div>
              <MultiStepOrderForm onOrderCreated={handleOrderCreated} onClose={() => setIsCreating(false)} />
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

      <EnhancedDeleteOrderDialog
        order={deletingOrder}
        open={!!deletingOrder}
        onOpenChange={() => setDeletingOrder(null)}
        onConfirmDelete={onDeleteOrder}
        isDeleting={isDeleting}
      />

      {editingNotes && (
        <NotesEditDialog
          isOpen={!!editingNotes}
          onClose={() => setEditingNotes(null)}
          orderId={editingNotes.id}
          orderNumber={editingNotes.order_number}
          currentNotes={{
            orderNotes: editingNotes.order_notes,
            deliveryNotes: editingNotes.delivery_notes,
            specialInstructions: editingNotes.special_instructions
          }}
          onNotesUpdated={handleNotesUpdated}
        />
      )}

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <OrderSearchFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            ordersCount={filteredOrders.length}
            totalCount={orders.length}
          />
          
          <OrderSearchControls
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
