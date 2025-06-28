
import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const OptimizedDashboard = React.lazy(() => 
  import('@/components/OptimizedDashboard').then(module => ({ 
    default: module.OptimizedDashboard 
  }))
);

const OptimizedOrderList = React.lazy(() => 
  import('@/components/OptimizedOrderList').then(module => ({ 
    default: module.OptimizedOrderList 
  }))
);

export function OptimizedDashboardOverview() {
  return (
    <ErrorBoundary fallbackTitle="Dashboard Error">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>

        {/* Main Dashboard Metrics */}
        <Suspense fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }>
          <OptimizedDashboard />
        </Suspense>

        {/* Recent Orders */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <Suspense fallback={<Skeleton className="h-96" />}>
              <OptimizedOrderList limit={10} />
            </Suspense>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Orders</h2>
            <Suspense fallback={<Skeleton className="h-96" />}>
              <OptimizedOrderList statusFilter="preparing" limit={10} />
            </Suspense>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
