
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { calculateDisplayTotal } from "@/utils/totalCalculationUtils";

interface CustomerOrdersProps {
  customer: any;
  onBack: () => void;
}

export function CustomerOrders({ customer, onBack }: CustomerOrdersProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing": return "bg-yellow-100 text-yellow-800";
      case "loading": return "bg-blue-100 text-blue-800";
      case "in_transit": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + calculateDisplayTotal(order), 0) || 0;
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {customer.first_name} {customer.last_name} - Orders
          </h1>
          <p className="text-slate-600">{customer.email}</p>
        </div>
      </div>

      {/* Customer Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Average Order</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No orders found for this customer.
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Order #{order.order_number}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>Date: {format(new Date(order.created_at), "MMM dd, yyyy")}</p>
                        <p>Total: ${calculateDisplayTotal(order).toFixed(2)}</p>
                        {order.delivery_date && (
                          <p>Delivery: {format(new Date(order.delivery_date), "MMM dd, yyyy")}</p>
                        )}
                        {order.special_instructions && (
                          <p>Instructions: {order.special_instructions}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col text-right text-sm text-slate-600">
                      <p>Customer: {order.customer_name}</p>
                      <p>Address: {order.customer_address}</p>
                      {order.customer_phone && <p>Phone: {order.customer_phone}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
