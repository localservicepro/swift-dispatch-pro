
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { useOptimizedOpportunityData } from '@/components/opportunity/useOptimizedOpportunityData';
import { Skeleton } from '@/components/ui/skeleton';

export function OptimizedOpportunityPipeline() {
  const { orders, isLoading } = useOptimizedOpportunityData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Group orders by status using correct enum values
  const ordersByStatus = React.useMemo(() => {
    let filtered = orders;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return {
      requested: filtered.filter(order => order.status === 'requested'),
      preparing: filtered.filter(order => order.status === 'preparing'),
      loading: filtered.filter(order => order.status === 'loading'),
      en_route: filtered.filter(order => order.status === 'en_route'),
      delivered: filtered.filter(order => order.status === 'delivered'),
      cancelled: filtered.filter(order => order.status === 'cancelled')
    };
  }, [orders, searchTerm, statusFilter]);

  const statusColumns = [
    { key: 'requested', title: 'Requested', color: 'bg-gray-100 border-gray-300' },
    { key: 'preparing', title: 'Preparing', color: 'bg-yellow-100 border-yellow-300' },
    { key: 'loading', title: 'Loading', color: 'bg-blue-100 border-blue-300' },
    { key: 'en_route', title: 'En Route', color: 'bg-orange-100 border-orange-300' },
    { key: 'delivered', title: 'Delivered', color: 'bg-green-100 border-green-300' },
    { key: 'cancelled', title: 'Cancelled', color: 'bg-red-100 border-red-300' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-96">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="requested">Requested</option>
            <option value="preparing">Preparing</option>
            <option value="loading">Loading</option>
            <option value="en_route">En Route</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statusColumns.map((column) => (
          <Card key={column.key} className={`${column.color} min-h-96`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                {column.title}
                <Badge variant="secondary">
                  {ordersByStatus[column.key as keyof typeof ordersByStatus].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordersByStatus[column.key as keyof typeof ordersByStatus].map((order) => (
                  <Card key={order.id} className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs">{order.order_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {order.payment_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{order.customer_name}</p>
                        <p className="text-xs font-medium">${order.total_amount?.toFixed(2)}</p>
                        {order.delivery_date && (
                          <p className="text-xs text-gray-500">
                            {new Date(order.delivery_date).toLocaleDateString()}
                            {order.delivery_time && ` at ${order.delivery_time}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 truncate">
                          Driver: {order.driver_name}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {ordersByStatus[column.key as keyof typeof ordersByStatus].length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-xs">No orders in this stage</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
