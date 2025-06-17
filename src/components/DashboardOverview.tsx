import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Truck, 
  Users, 
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { OrderStatusTest } from "./order/OrderStatusTest";

export function DashboardOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total_amount, created_at');
      
      const { data: customers } = await supabase
        .from('customers')
        .select('id');
      
      const { data: products } = await supabase
        .from('products')
        .select('id, stock_quantity');

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const totalCustomers = customers?.length || 0;
      const totalProducts = products?.length || 0;
      
      const statusCounts = orders?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        statusCounts
      };
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
          <p className="text-slate-600 mt-1">Loading your business metrics...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
          <p className="text-slate-600 mt-1">Monitor your business performance and key metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              ${stats?.totalRevenue.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across all orders
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              Orders processed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Products</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              In catalog
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Overview & Test Component */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Order Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.statusCounts || {}).map(([status, count]) => {
                const getStatusInfo = (status: string) => {
                  switch (status) {
                    case 'delivered':
                      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
                    case 'en_route':
                      return { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' };
                    case 'loading':
                      return { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' };
                    case 'preparing':
                      return { icon: Package, color: 'text-yellow-600', bg: 'bg-yellow-100' };
                    case 'cancelled':
                      return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' };
                    default:
                      return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' };
                  }
                };

                const statusInfo = getStatusInfo(status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      </div>
                      <span className="font-medium capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Test Component */}
        <OrderStatusTest />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium">Orders System</p>
              <p className="text-xs text-slate-500">Operational</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium">Real-time Updates</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium">Email Service</p>
              <p className="text-xs text-slate-500">Connected</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium">Status Updates</p>
              <p className="text-xs text-slate-500">Testing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
