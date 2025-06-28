
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptimizedOrderData } from '@/hooks/useOptimizedOrderData';

interface OptimizedOrderListProps {
  statusFilter?: string;
  searchTerm?: string;
  limit?: number;
}

export function OptimizedOrderList({ 
  statusFilter = 'all', 
  searchTerm = '', 
  limit = 50 
}: OptimizedOrderListProps) {
  const { orders, isLoading } = useOptimizedOrderData();

  // Memoized filtering to prevent unnecessary re-renders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term)
      );
    }

    return filtered.slice(0, limit);
  }, [orders, statusFilter, searchTerm, limit]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredOrders.map((order) => (
        <Card key={order.id} className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {order.order_number}
              </CardTitle>
              <Badge variant="outline">
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 text-sm text-gray-600">
              <p>{order.customer_name}</p>
              <p>${order.total_amount?.toFixed(2) || '0.00'}</p>
              <p>{order.driver_name}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No orders found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
