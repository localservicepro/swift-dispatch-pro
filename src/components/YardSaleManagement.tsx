import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Package, Filter, X, ShoppingBag } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateOrderStatus as updateOrderStatusService } from "@/utils/orderStatusService";
import { emailService } from "@/utils/emailService";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

const YARD_SALE_STAGES = [
  { id: 'requested', title: 'Requested', color: 'bg-slate-100 border-slate-300', textColor: 'text-slate-700' },
  { id: 'preparing', title: 'Preparing', color: 'bg-yellow-100 border-yellow-300', textColor: 'text-yellow-700' },
  { id: 'ready_for_pickup', title: 'Ready for Pickup', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-700' },
  { id: 'delivered', title: 'Picked Up', color: 'bg-green-100 border-green-300', textColor: 'text-green-700' }
];

export function YardSaleManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();

  // Fetch pickup/yard sale orders
  const { data: yardSaleOrders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['yard-sale-orders'],
    queryFn: async () => {
      console.log('Fetching yard sale (pickup) orders...');
      
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
          total_amount,
          status,
          payment_status,
          created_at,
          delivery_date,
          delivery_time,
          special_instructions,
          customer_id,
          delivery_method,
          customers!orders_customer_id_fkey(
            id,
            company_name,
            business_name,
            customer_type
          )
        `)
        .is('deleted_at', null)
        .eq('delivery_method', 'pickup')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching yard sale orders:', ordersError);
        throw ordersError;
      }

      return ordersData || [];
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    let filtered = yardSaleOrders;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) || 
        order.customer_name.toLowerCase().includes(query) ||
        (order.purchase_order && order.purchase_order.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [yardSaleOrders, searchQuery, statusFilter]);

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped = YARD_SALE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {} as Record<string, any[]>);

    filteredOrders.forEach(order => {
      // Map order status to yard sale stages
      let stage = 'requested';
      if (order.status === 'preparing') {
        stage = 'preparing';
      } else if (order.status === 'ready_for_pickup') {
        stage = 'ready_for_pickup';
      } else if (order.status === 'delivered') {
        stage = 'delivered';
      }

      grouped[stage].push(order);
    });

    return grouped;
  }, [filteredOrders]);

  // Update order status
  const updateOrderStatus = async (orderId: string, currentStatus: string, newStatus: string, orderNumber: string, customerName: string, orderData?: any) => {
    try {
      if (!profile?.full_name) {
        throw new Error('User profile not found');
      }

      await updateOrderStatusService({
        orderId,
        orderNumber,
        customerName,
        oldStatus: currentStatus,
        newStatus,
        updatedBy: profile.full_name,
        notes: `Status updated via yard sale management`
      });

      // If moving to ready_for_pickup, send email notification
      if (newStatus === 'ready_for_pickup' && orderData) {
        try {
          // Get customer email
          let customerEmail = '';
          if (orderData.customer_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('email')
              .eq('id', orderData.customer_id)
              .single();
            customerEmail = customerData?.email || '';
          }

          if (customerEmail) {
            // Format order items from products JSON
            const orderItems = (orderData.products || []).map((item: any) => ({
              name: item.name || item.product_name || 'Product',
              quantity: item.quantity || 1,
              price: item.price || item.unit_price || 0,
            }));

            await emailService.sendPickupReadyNotification({
              customerName: orderData.customer_name,
              customerEmail,
              orderNumber: orderData.order_number,
              orderItems,
              totalAmount: orderData.total_amount || 0,
              pickupAddress: businessSettings?.business_address || 'Please contact us for pickup location',
              businessName: businessSettings?.business_name,
              businessHours: 'Monday - Friday: 8:00 AM - 5:00 PM',
              specialInstructions: orderData.special_instructions,
              contactPhone: businessSettings?.business_phone,
            });

            toast({
              title: "Email Sent",
              description: `Pickup ready notification sent to ${customerEmail}`,
            });
          }
        } catch (emailError) {
          console.error('Error sending pickup ready email:', emailError);
          // Don't fail the status update if email fails
          toast({
            title: "Warning",
            description: "Status updated but email notification failed to send",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Status Updated",
        description: `Order ${orderNumber} moved to ${YARD_SALE_STAGES.find(s => s.id === newStatus)?.title}`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  // Real-time subscription for pickup orders
  useEffect(() => {
    const channel = supabase
      .channel('yard-sale-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'delivery_method=eq.pickup'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Yard Sale Management</h2>
            <p className="text-slate-600 mt-1">Manage pickup orders and yard sale requests</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading yard sale data. Please try again.</p>
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
          <h2 className="font-bold text-slate-800 flex items-center gap-2 text-base">
            <ShoppingBag className="w-8 h-8" />
            Yard Sale Management
          </h2>
          <p className="text-slate-600 mt-1">Manage pickup orders and yard sale requests</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{filteredOrders.length}</p>
            <p className="text-sm text-slate-600">Total Orders</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by order number, customer name, or PO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                <SelectItem value="delivered">Picked Up</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {YARD_SALE_STAGES.map((stage) => (
          <Card key={stage.id} className={`border-2 ${stage.color}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-lg ${stage.textColor} flex items-center justify-between`}>
                {stage.title}
                <Badge variant="secondary" className="ml-2">
                  {ordersByStatus[stage.id]?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ordersByStatus[stage.id]?.map((order) => (
                <Card key={order.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{order.order_number}</h4>
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {order.payment_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    {order.purchase_order && (
                      <p className="text-xs text-slate-500">PO: {order.purchase_order}</p>
                    )}
                    <p className="text-sm font-medium">${order.total_amount}</p>
                    
                    {/* Status Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      {stage.id === 'requested' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'requested', 'preparing', order.order_number, order.customer_name, order)}
                          className="w-full"
                        >
                          Mark Preparing
                        </Button>
                      )}
                      {stage.id === 'preparing' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'preparing', 'ready_for_pickup', order.order_number, order.customer_name, order)}
                          className="w-full"
                        >
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {stage.id === 'ready_for_pickup' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'ready_for_pickup', 'delivered', order.order_number, order.customer_name, order)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Mark Picked Up
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {ordersByStatus[stage.id]?.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No orders</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}