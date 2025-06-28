
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  pendingOrders: number;
  recentOrders: any[];
  ordersByStatus: Record<string, number>;
}

export function useOptimizedDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      console.log('Fetching optimized dashboard metrics...');

      // Single query for all metrics using database aggregation
      const [ordersResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at, customer_name, order_number')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('customers')
          .select('id, is_active')
          .eq('is_active', true)
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customersResult.error) throw customersResult.error;

      const orders = ordersResult.data || [];
      const customers = customersResult.data || [];

      // Calculate metrics in memory (faster than multiple DB queries)
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const ordersByStatus = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrders: orders.length,
        totalRevenue,
        activeCustomers: customers.length,
        pendingOrders: ordersByStatus['preparing'] || 0,
        recentOrders: orders.slice(0, 10),
        ordersByStatus
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  return { 
    metrics: metrics || {
      totalOrders: 0,
      totalRevenue: 0,
      activeCustomers: 0,
      pendingOrders: 0,
      recentOrders: [],
      ordersByStatus: {}
    }, 
    isLoading 
  };
}
