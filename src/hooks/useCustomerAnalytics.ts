import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerAnalytics {
  orderStats: {
    total: number;
    delivered: number;
    inProgress: number;
    pending: number;
    cancelled: number;
  };
  financial: {
    totalSpent: number;
    pendingPayments: number;
    averageOrderValue: number;
    monthlySpend: number;
  };
  recentOrders: any[];
}

export function useCustomerAnalytics(customerId?: string) {
  return useQuery({
    queryKey: ['customer-analytics', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null);
      
      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate order statistics
      const orderStats = {
        total: orders.length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        inProgress: orders.filter(o => ['preparing', 'loading', 'en_route'].includes(o.status)).length,
        pending: orders.filter(o => ['requested', 'back_order'].includes(o.status)).length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      // Calculate financial metrics
      const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      const pendingPayments = orders
        .filter(o => o.payment_status === 'pending')
        .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      
      const monthlyOrders = orders.filter(o => new Date(o.created_at) >= firstDayOfMonth);
      const monthlySpend = monthlyOrders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

      const averageOrderValue = orderStats.total > 0 ? totalSpent / orderStats.total : 0;

      const financial = {
        totalSpent,
        pendingPayments,
        averageOrderValue,
        monthlySpend,
      };

      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const analytics: CustomerAnalytics = {
        orderStats,
        financial,
        recentOrders,
      };

      return analytics;
    },
    enabled: !!customerId,
  });
}
