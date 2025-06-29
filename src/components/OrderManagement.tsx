import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { DeletedOrdersDialog } from "./order/DeletedOrdersDialog";
import { PurchaseOrderDisplay } from "./order/PurchaseOrderDisplay";
import { Database } from "@/integrations/supabase/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, X, MapPin, Truck, FileText, Trash2, Edit3 } from "lucide-react";
import { emailService } from "@/utils/emailService";
import { activityLogger } from "@/utils/activityLogger";
import { useAuth } from "./auth/AuthProvider";
import { getTruckInfo } from "@/utils/truckUtils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EnhancedDeleteOrderDialog } from "./order/EnhancedDeleteOrderDialog";
import { useSplitOrderGroups } from "@/hooks/useSplitOrderGroups";
import { NotesIndicator } from "./notes/NotesIndicator";
import { NotesDisplaySection } from "./notes/NotesDisplaySection";
import { NotesEditDialog } from "./notes/NotesEditDialog";

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
  // New denormalized fields
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
  const { profile } = useAuth();
  const { deleteSplitOrderGroup } = useSplitOrderGroups();

  // Fetch orders from database with the new denormalized fields
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching orders from database with denormalized fields...');

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          purchase_order,
          customer_name,
          customer_phone,
          customer_address,
          products,
          products_formatted,
          total_amount,
          status,
          driver_id,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_fee,
          subtotal,
          truck_type,
          truck_id,
          order_notes,
          delivery_notes,
          driver_name,
          truck_registration,
          truck_type_display,
          customers!orders_customer_id_fkey(
            id,
            suburb_id,
            suburbs(id, name, state, postcode)
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log('Raw orders data:', ordersData);

      // Map the data using the denormalized fields
      const mappedOrders = ordersData?.map(order => {
        const suburbData = order.customers?.suburbs;
        const suburbId = order.customers?.suburb_id;

        return {
          ...order,
          suburb_id: suburbId || null,
          suburb_name: suburbData?.name || null,
          suburb_state: suburbData?.state || null,
          suburb_postcode: suburbData?.postcode || null,
          // Use denormalized fields directly
          driver_name: order.driver_name || 'Not Assigned',
          truck_registration: order.truck_registration || null,
          truck_type_display: order.truck_type_display || null
        };
      }) || [];

      console.log('Final mapped orders with denormalized fields:', mappedOrders);
      return mappedOrders;
    }
  });

  // Filter orders based on search query and status
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        (order.customer_phone && order.customer_phone.toLowerCase().includes(query)) ||
        (order.purchase_order && order.purchase_order.toLowerCase().includes(query))
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

  // Enhanced delete handler that supports both single and group deletion
  const handleDeleteOrder = async (orderId: string, deleteType: 'single' | 'group') => {
    if (!deletingOrder || isDeleting) return;

    setIsDeleting(true);
    try {
      if (deleteType === 'group') {
        // Use the split order group deletion
        await deleteSplitOrderGroup(orderId, 'Admin deletion');
      } else {
        // Use regular single order deletion
        const { error } = await supabase.rpc('soft_delete_order', {
          p_order_id: orderId,
          p_reason: 'Admin deletion'
        });

        if (error) throw error;

        // Log the activity
        if (profile?.full_name) {
          await activityLogger.orderSoftDelete(
            orderId,
            deletingOrder.order_number,
            deletingOrder.customer_name,
            'Admin deletion',
            profile.full_name
          );
        }

        toast({
          title: "Order Deleted",
          description: `Order ${deletingOrder.order_number} has been moved to deleted orders`
        });
      }

      // Refresh orders
      refetch();
      setDeletingOrder(null);
    } catch (error: any) {
      console.error('Delete order error:', error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive"
      });
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

        // Invalidate and refetch orders when any change occurs
        queryClient.invalidateQueries({ queryKey: ['orders'] });

        // Handle status updates with email notifications
        if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            toast({
              title: "Order Status Updated",
              description: `Order ${payload.new.order_number} changed from ${oldStatus} to ${newStatus}`
            });

            // Send email notification to customer
            try {
              // Use denormalized driver_name field
              const driverName = payload.new.driver_name;
              await emailService.sendOrderStatusUpdate(payload.new.id, oldStatus, newStatus, driverName);
            } catch (error) {
              console.error('Failed to send status update email:', error);
              // Don't show error toast to admin as email is background process
            }
          }
        }

        // Show toast for new orders
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
    // Refresh orders list from database
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!"
    });
  };

  const handleOrderUpdated = () => {
    // Refresh orders list from database
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!"
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "en_route":
        return "bg-blue-100 text-blue-800";
      case "loading":
        return "bg-orange-100 text-orange-800";
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "en_route":
        return "En Route";
      case "delivered":
        return "Delivered";
      case "loading":
        return "Loading";
      case "preparing":
        return "Preparing";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const formatProducts = (products: any, productsFormatted?: string) => {
    // Use the formatted version if available (from database trigger)
    if (productsFormatted && productsFormatted.trim() !== '') {
      return productsFormatted;
    }
    
    // Fallback to original formatting logic
    if (!products) return 'No products';
    if (Array.isArray(products)) {
      return products.map(p => {
        const name = p.name || p.product_name || 'Product';
        const quantity = p.quantity || 1;
        return `${name} (Qty: ${quantity})`;
      }).join(', ');
    }
    return 'Products listed';
  };

  // Quick status update function for admin with activity logging
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, currentOrder: Order) => {
    try {
      const oldStatus = currentOrder.status;
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the activity
      if (profile?.full_name) {
        if (newStatus === 'cancelled') {
          await activityLogger.orderCancel(orderId, currentOrder.order_number, currentOrder.customer_name, profile.full_name);
        } else {
          await activityLogger.orderStatusUpdate(orderId, currentOrder.order_number, currentOrder.customer_name, oldStatus, newStatus, profile.full_name);
        }
      }

      toast({
        title: "Status Updated",
        description: `Order ${currentOrder.order_number} status updated to ${newStatus.replace('_', ' ')}`
      });

      // Refresh orders
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
            <p className="text-slate-600 mt-1">Create and manage customer orders</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
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
          <h2 className="font-bold text-slate-800 text-lg">Order Management</h2>
          <p className="text-slate-600 mt-1">Create and manage customer orders • Real-time updates enabled</p>
        </div>
        <div className="flex items-center gap-3">
          <DeletedOrdersDialog />
          <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            Create New Order
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Close
                </Button>
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

      {/* Enhanced Delete Confirmation Dialog */}
      <EnhancedDeleteOrderDialog
        order={deletingOrder}
        open={!!deletingOrder}
        onOpenChange={() => setDeletingOrder(null)}
        onConfirmDelete={handleDeleteOrder}
        isDeleting={isDeleting}
      />

      {/* Notes Edit Dialog */}
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
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order number, customer name, phone, or purchase order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-48">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <Button variant="outline" onClick={clearFilters} className="mt-2">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <p>No orders found. Create your first order to get started!</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                // Create formatted truck info using denormalized fields
                let truckDisplayInfo = '';
                if (order.truck_type_display && order.truck_registration) {
                  truckDisplayInfo = `${order.truck_type_display} ${order.truck_registration}`;
                } else if (order.truck_type_display) {
                  truckDisplayInfo = order.truck_type_display;
                } else if (order.truck_registration) {
                  truckDisplayInfo = order.truck_registration;
                }

                return (
                  <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">{order.order_number}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        <PurchaseOrderDisplay purchaseOrder={order.purchase_order} variant="secondary" />
                        <NotesIndicator 
                          orderNotes={order.order_notes} 
                          deliveryNotes={order.delivery_notes} 
                          specialInstructions={order.special_instructions} 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">
                          ${order.total_amount.toFixed(2)}
                        </span>
                        {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNotesEdit(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-slate-500">Customer</p>
                        <p className="font-medium">{order.customer_name}</p>
                        {order.customer_phone && <p className="text-xs text-slate-400">{order.customer_phone}</p>}
                      </div>
                      <div>
                        <p className="text-slate-500">Products</p>
                        <p className="font-medium">{formatProducts(order.products, order.products_formatted)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Driver</p>
                        <p className="font-medium">{order.driver_name || 'Not Assigned'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Suburb
                        </p>
                        <p className="font-medium">
                          {order.suburb_name ? 
                            `${order.suburb_name}, ${order.suburb_state}${order.suburb_postcode ? ` (${order.suburb_postcode})` : ''}` : 
                            'Not specified'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Truck Information using denormalized fields */}
                    {truckDisplayInfo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-slate-500 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Assigned Truck
                          </p>
                          <p className="font-medium">{truckDisplayInfo}</p>
                        </div>
                      </div>
                    )}

                    {/* Notes Section */}
                    {(order.order_notes?.trim() || order.delivery_notes?.trim() || order.special_instructions?.trim()) && (
                      <div className="mb-3">
                        <NotesDisplaySection
                          orderNotes={order.order_notes}
                          deliveryNotes={order.delivery_notes}
                          specialInstructions={order.special_instructions}
                          compact={false}
                          onEditClick={() => handleNotesEdit(order)}
                        />
                      </div>
                    )}

                    {/* Order Meta Information */}
                    <div className="mt-3 text-xs text-slate-400">
                      <p>Address: {order.customer_address}</p>
                      <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
                      {order.delivery_date && (
                        <p>Delivery: {order.delivery_date} {order.delivery_time && `at ${order.delivery_time}`}</p>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => setEditingOrder(order)}>
                        Edit
                      </Button>
                      
                      {/* Quick status update buttons for admin */}
                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'loading', order)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          Mark Loading
                        </Button>
                      )}
                      
                      {order.status === 'loading' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'en_route', order)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          Mark En Route
                        </Button>
                      )}
                      
                      {order.status === 'en_route' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'delivered', order)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          Mark Delivered
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateOrderStatus(order.id, 'cancelled', order)}
                      >
                        Cancel
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeletingOrder(order)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
