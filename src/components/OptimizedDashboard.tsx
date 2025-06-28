
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizedDashboard } from '@/hooks/useOptimizedDashboard';
import { useOptimizedRealTime } from '@/hooks/useOptimizedRealTime';
import { DollarSign, Package, Users, Clock } from 'lucide-react';

export function OptimizedDashboard() {
  const { metrics, isLoading } = useOptimizedDashboard();
  
  // Setup real-time updates
  useOptimizedRealTime();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Revenue",
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Total earnings",
    },
    {
      title: "Total Orders",
      value: metrics.totalOrders.toString(),
      icon: Package,
      description: "All time orders",
    },
    {
      title: "Active Customers",
      value: metrics.activeCustomers.toString(),
      icon: Users,
      description: "Registered customers",
    },
    {
      title: "Pending Orders",
      value: metrics.pendingOrders.toString(),
      icon: Clock,
      description: "Awaiting processing",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">${order.total_amount?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
