
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { emailService } from "@/utils/emailService";
import { useOrderData, useFilteredOrders } from "./hooks/useOrderData";
import { useOrderActions } from "./hooks/useOrderActions";
import { Database } from "@/integrations/supabase/types";

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
  payment_status?: string;
  payment_date?: string;
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
  company_name?: string;
  business_name?: string;
  customer_type?: string;
}

interface OrderManagementContextType {
  // State
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  editingOrder: Order | null;
  setEditingOrder: (order: Order | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (filter: string) => void;
  deletingOrder: Order | null;
  setDeletingOrder: (order: Order | null) => void;
  isDeleting: boolean;
  editingNotes: Order | null;
  setEditingNotes: (order: Order | null) => void;
  
  // Data
  orders: Order[];
  isLoading: boolean;
  error: any;
  filteredOrders: Order[];
  
  // Actions
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, currentOrder: Order) => void;
  handleDeleteOrder: (orderId: string, deleteType: 'single' | 'group') => Promise<void>;
  refetch: () => void;
  
  // Computed
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

const OrderManagementContext = createContext<OrderManagementContextType | undefined>(undefined);

export function useOrderManagement() {
  const context = useContext(OrderManagementContext);
  if (!context) {
    throw new Error('useOrderManagement must be used within OrderManagementProvider');
  }
  return context;
}

interface OrderManagementProviderProps {
  children: ReactNode;
}

export function OrderManagementProvider({ children }: OrderManagementProviderProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use custom hooks for data and actions
  const { orders, isLoading, error, refetch } = useOrderData();
  const { updateOrderStatus, handleDeleteOrder: handleDeleteOrderAction } = useOrderActions(refetch);
  const filteredOrders = useFilteredOrders(orders, searchQuery, statusFilter, paymentStatusFilter);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || paymentStatusFilter !== "all";

  // Enhanced delete handler that supports both single and group deletion
  const handleDeleteOrder = async (orderId: string, deleteType: 'single' | 'group') => {
    if (!deletingOrder || isDeleting) return;

    setIsDeleting(true);
    try {
      await handleDeleteOrderAction(orderId, deleteType, deletingOrder);
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
        queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
        queryClient.invalidateQueries({ queryKey: ['opportunity-orders'] });

        if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            toast({
              title: "Order Status Updated",
              description: `Order ${payload.new.order_number} changed from ${oldStatus} to ${newStatus}`
            });

            // Only send email notification when order status changes to loading
            if (newStatus === 'loading') {
              try {
                const driverName = payload.new.driver_name;
                await emailService.sendOrderStatusUpdate(payload.new.id, oldStatus, newStatus, driverName);
              } catch (error) {
                console.error('Failed to send status update email:', error);
              }
            }
          }
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          toast({
            title: "New Order Created",
            description: `Order ${payload.new.order_number} has been created`
          });
        }

        // Auto-sync to Google Sheets if enabled
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          try {
            const { data: sheetsSettings } = await supabase
              .from('google_sheets_settings')
              .select('sync_enabled, spreadsheet_id')
              .limit(1)
              .single();
            
            if (sheetsSettings?.sync_enabled && sheetsSettings?.spreadsheet_id) {
              supabase.functions.invoke('google-sheets-sync', {
                body: { action: 'sync-single', order_id: payload.new.id },
              }).catch(err => console.error('Google Sheets auto-sync error:', err));
            }
          } catch (err) {
            console.error('Failed to check Google Sheets settings:', err);
          }
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const contextValue: OrderManagementContextType = {
    // State
    isCreating,
    setIsCreating,
    editingOrder,
    setEditingOrder,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    deletingOrder,
    setDeletingOrder,
    isDeleting,
    editingNotes,
    setEditingNotes,
    
    // Data
    orders,
    isLoading,
    error,
    filteredOrders,
    
    // Actions
    updateOrderStatus,
    handleDeleteOrder,
    refetch,
    
    // Computed
    hasActiveFilters,
    clearFilters
  };

  return (
    <OrderManagementContext.Provider value={contextValue}>
      {children}
    </OrderManagementContext.Provider>
  );
}
