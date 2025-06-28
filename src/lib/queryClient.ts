
import { QueryClient } from '@tanstack/react-query';

// Optimized query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Improved caching and retry logic
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      // Enable background refetching only when network is good
      refetchInterval: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  orders: ['orders'] as const,
  optimizedOrders: ['optimized-orders'] as const,
  dashboardMetrics: ['dashboard-metrics'] as const,
  customers: ['customers'] as const,
  products: ['products'] as const,
  // Add more query keys as needed
};
