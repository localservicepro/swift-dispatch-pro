import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Edit, Trash2, Calendar, User, Phone, MapPin, DollarSign, Clock, Truck, Package } from "lucide-react";
import { MultiStepOrderForm } from "./order/MultiStepOrderForm";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { getTruckInfo } from "@/utils/truckUtils";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export function OrderManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery("orders", async () => {
    let query = supabase.from("orders").select("*");

    if (searchQuery) {
      query = query.ilike("order_number", `%${searchQuery}%`);
    }

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    refetch(); // Refresh data when component mounts
  }, []);

  const openCreateOrderDialog = () => {
    setIsCreateOrderDialogOpen(true);
  };

  const closeCreateOrderDialog = () => {
    setIsCreateOrderDialogOpen(false);
    refetch(); // Refresh data after closing the dialog
  };

  const openEditDialog = (order: any) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setSelectedOrder(null);
    setIsEditDialogOpen(false);
    refetch(); // Refresh data after closing the dialog
  };

  const deleteOrder = async (orderId: string) => {
    if (
      window.confirm("Are you sure you want to delete this order? This action cannot be undone.")
    ) {
      try {
        const { error } = await supabase.from("orders").delete().eq("id", orderId);
        if (error) throw error;
        toast({
          title: "Order Deleted",
          description: "The order has been successfully deleted.",
        });
        refetch(); // Refresh data after deletion
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const currentOrder = orders?.find(order => order.id === orderId);
    if (!currentOrder) return;

    try {
      const oldStatus = currentOrder.status;
      
      const { error } = await supabase.rpc('update_order_status', {
        order_id: orderId,
        new_status: newStatus,
        notes: `Status updated by admin from ${oldStatus} to ${newStatus}`,
        location: JSON.stringify(null) // Convert null to JSON string
      });

      if (error) {
        console.error('OrderManagement RPC error:', error);
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus.replace('_', ' ')}`,
      });

      // Refresh orders
      refetch();
    } catch (error: any) {
      console.error('OrderManagement status update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "loading":
        return "bg-blue-100 text-blue-800";
      case "en_route":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "preparing":
        return <Package className="w-4 h-4" />;
      case "loading":
        return <Clock className="w-4 h-4" />;
      case "en_route":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Order Management</h2>
          <p className="text-slate-600 mt-1">Manage and track all your orders</p>
        </div>
        <Button onClick={openCreateOrderDialog} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-slate-800">
              {orders?.length} Orders
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 sm:w-48">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders?.map((order) => {
                  const truckInfo = getTruckInfo(order.truck_type);
                  return (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-no-wrap text-sm leading-5 font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {order.customer_name}
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            {order.customer_phone}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {order.customer_address}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        {order.delivery_date && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {order.delivery_date} {order.delivery_time}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          {order.total_amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-sm leading-5 text-gray-500">
                        <Badge className={getStatusColor(order.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status.replace("_", " ").toUpperCase()}
                          </div>
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-no-wrap text-right text-sm leading-5 font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEditDialog(order)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value as OrderStatus)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder={order.status} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="loading">Loading</SelectItem>
                              <SelectItem value="en_route">En Route</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <MultiStepOrderForm open={isCreateOrderDialogOpen} onClose={closeCreateOrderDialog} />

      {selectedOrder && (
        <OrderEditDialog
          order={selectedOrder}
          onOrderUpdated={closeEditDialog}
          onClose={closeEditDialog}
        />
      )}
    </div>
  );
}
