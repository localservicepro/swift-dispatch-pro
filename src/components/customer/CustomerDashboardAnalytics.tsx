import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerAnalytics } from "@/hooks/useCustomerAnalytics";
import { 
  TrendingUp, 
  Package, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Plus,
  Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CustomerDashboardAnalyticsProps {
  customerId: string;
  customerType: string;
  onCreateOrder: () => void;
  onManageContacts: () => void;
}

export function CustomerDashboardAnalytics({ 
  customerId, 
  customerType,
  onCreateOrder,
  onManageContacts 
}: CustomerDashboardAnalyticsProps) {
  const { data: analytics, isLoading } = useCustomerAnalytics(customerId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const statusData = [
    { name: 'Delivered', value: analytics.orderStats.delivered, color: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: analytics.orderStats.inProgress, color: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: analytics.orderStats.pending, color: 'hsl(var(--chart-3))' },
    { name: 'Cancelled', value: analytics.orderStats.cancelled, color: 'hsl(var(--chart-4))' },
  ].filter(item => item.value > 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'bg-blue-500/10 text-blue-500',
      preparing: 'bg-yellow-500/10 text-yellow-500',
      loading: 'bg-orange-500/10 text-orange-500',
      en_route: 'bg-purple-500/10 text-purple-500',
      delivered: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500',
      back_order: 'bg-amber-500/10 text-amber-500',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">Create New Order</h3>
                <p className="text-sm text-muted-foreground">Place a new order quickly</p>
              </div>
              <Button onClick={onCreateOrder}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        {customerType === 'account' && (
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Manage Team</h3>
                  <p className="text-sm text-muted-foreground">Add or update contacts</p>
                </div>
                <Button variant="outline" onClick={onManageContacts}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orderStats.total}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orderStats.delivered}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.orderStats.total > 0 
                ? `${Math.round((analytics.orderStats.delivered / analytics.orderStats.total) * 100)}% completion rate`
                : 'No orders yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orderStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.orderStats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.financial.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.financial.pendingPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.financial.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.financial.monthlySpend.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current month spending</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Orders */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Status Chart */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)} variant="outline">
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <p className="font-semibold text-sm">${Number(order.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent orders</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
