
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  DollarSign, 
  AlertTriangle, 
  Plus, 
  Users, 
  TrendingUp,
  ShoppingCart,
  FileText,
  RefreshCw
} from "lucide-react";

interface DashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  ordersInTransit: number;
  completedDeliveries: number;
  totalRevenue: number;
  unpaidPayments: number;
  unpaidAmount: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface StockAlert {
  id: string;
  name: string;
  stock_quantity: number;
  sku: string;
}

export function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0,
    pendingOrders: 0,
    ordersInTransit: 0,
    completedDeliveries: 0,
    totalRevenue: 0,
    unpaidPayments: 0,
    unpaidAmount: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          console.log('Orders changed, refreshing dashboard...');
          loadDashboardData();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('dashboard-products')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Products changed, refreshing stock alerts...');
          loadStockAlerts();
        }
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel('dashboard-invoices')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'invoices' },
        () => {
          console.log('Invoices changed, refreshing metrics...');
          loadMetrics();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(invoicesChannel);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      loadMetrics(),
      loadRecentOrders(),
      loadStockAlerts(),
      loadChartData()
    ]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    try {
      // Get order metrics
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total_amount, created_at');

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'preparing').length || 0;
      const ordersInTransit = orders?.filter(o => o.status === 'en_route').length || 0;
      const completedDeliveries = orders?.filter(o => o.status === 'delivered').length || 0;
      
      // Calculate current month revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const totalRevenue = orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear &&
               o.status === 'delivered';
      }).reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      // Get unpaid invoices
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'pending');

      const unpaidPayments = unpaidInvoices?.length || 0;
      const unpaidAmount = unpaidInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

      setMetrics({
        totalOrders,
        pendingOrders,
        ordersInTransit,
        completedDeliveries,
        totalRevenue,
        unpaidPayments,
        unpaidAmount
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentOrders(data || []);
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const loadStockAlerts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock_quantity, sku')
        .eq('is_active', true)
        .lte('stock_quantity', 10)
        .order('stock_quantity', { ascending: true });

      setStockAlerts(data || []);
    } catch (error) {
      console.error('Error loading stock alerts:', error);
    }
  };

  const loadChartData = async () => {
    try {
      // Weekly revenue data
      const { data: weeklyOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const weeklyRevenue = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayName = date.toLocaleDateString('en', { weekday: 'short' });
        const dayRevenue = weeklyOrders?.filter(o => 
          new Date(o.created_at).toDateString() === date.toDateString()
        ).reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
        
        return { name: dayName, revenue: dayRevenue };
      });

      setWeeklyData(weeklyRevenue);

      // Monthly delivery trends
      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString());

      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthName = date.toLocaleDateString('en', { month: 'short' });
        
        const monthOrders = monthlyOrders?.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate.getMonth() === date.getMonth() && 
                 orderDate.getFullYear() === date.getFullYear();
        }) || [];

        return {
          name: monthName,
          delivered: monthOrders.filter(o => o.status === 'delivered').length,
          pending: monthOrders.filter(o => o.status !== 'delivered').length
        };
      });

      setMonthlyData(monthlyTrends);

      // Status distribution
      const { data: allOrders } = await supabase
        .from('orders')
        .select('status');

      const statusCounts = allOrders?.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        color: getStatusColor(status)
      }));

      setStatusData(statusDistribution);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#f59e0b';
      case 'loading': return '#3b82f6';
      case 'en_route': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'preparing': return 'secondary';
      case 'loading': return 'default';
      case 'en_route': return 'secondary';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
          <p className="text-slate-600 mt-1">Real-time business insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{metrics.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{metrics.ordersInTransit}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{metrics.completedDeliveries}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue (Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{formatCurrency(metrics.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Unpaid ({metrics.unpaidPayments})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(metrics.unpaidAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-16 flex flex-col gap-2" onClick={() => window.location.hash = '#orders'}>
              <Plus className="w-6 h-6" />
              Add New Order
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={() => window.location.hash = '#products'}>
              <Package className="w-6 h-6" />
              Add Product
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={() => window.location.hash = '#drivers'}>
              <Users className="w-6 h-6" />
              Update Deliveries
            </Button>
            <Button variant="outline" className="h-16 flex flex-col gap-2" onClick={() => window.location.hash = '#payments'}>
              <FileText className="w-6 h-6" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent orders</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-600">{order.customer_name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(order.total_amount)}</div>
                      <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stockAlerts.length === 0 ? (
                <p className="text-green-600 text-center py-4">All products well stocked</p>
              ) : (
                stockAlerts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.sku && (
                        <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={product.stock_quantity === 0 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} left`}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Delivery Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} name="Delivered" />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
