
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealTimePayments } from "@/hooks/useRealTimePayments";
import { detectSplitOrderGroups } from "@/components/order/utils/splitOrderUtils";

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
}

export function usePaymentManagement() {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [sendingInvoices, setSendingInvoices] = useState<string[]>([]);
  const [generatingInvoices, setGeneratingInvoices] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [splitOrderGroups, setSplitOrderGroups] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up real-time payment updates
  useRealTimePayments((update) => {
    console.log('Payment update received in PaymentManagement:', update);
    setLastUpdateTime(new Date());
    queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
  });

  // Fetch payment orders
  const {
    data: payments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payment-orders'],
    queryFn: async (): Promise<PaymentOrder[]> => {
      console.log('Fetching payment orders from database...');
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          customer_name,
          customer_phone,
          total_amount,
          payment_status,
          payment_method,
          payment_date,
          created_at,
          products,
          delivery_fee,
          subtotal,
          customers!orders_customer_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment orders:', error);
        throw error;
      }

      return data.map(order => ({
        ...order,
        customer_email: order.customers?.email || `${order.customer_name.toLowerCase().replace(' ', '.')}@example.com`,
        payment_status: order.payment_status || 'pending'
      }));
    },
    refetchInterval: 30000
  });

  // Detect split order groups
  useEffect(() => {
    const detectGroups = async () => {
      if (payments.length > 0) {
        try {
          const groups = await detectSplitOrderGroups(payments);
          setSplitOrderGroups(groups);
        } catch (error) {
          console.error('Error detecting split order groups:', error);
          setSplitOrderGroups([]);
        }
      } else {
        setSplitOrderGroups([]);
      }
    };

    detectGroups();
  }, [payments]);

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId) 
        : [...prev, paymentId]
    );
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : null
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Payment Status Updated",
        description: `Payment status changed to ${newStatus}`
      });
      refetch();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  return {
    payments,
    isLoading,
    error,
    refetch,
    selectedPayments,
    setSelectedPayments,
    sendingInvoices,
    setSendingInvoices,
    generatingInvoices,
    setGeneratingInvoices,
    lastUpdateTime,
    splitOrderGroups,
    togglePaymentSelection,
    updatePaymentStatus,
    toast
  };
}
