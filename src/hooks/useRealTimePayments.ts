
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentUpdate {
  id: string;
  payment_status: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
}

interface InvoiceUpdate {
  id: string;
  status: string;
  invoice_number: string;
  amount: number;
  order_id: string;
}

export function useRealTimePayments(onPaymentUpdate?: (update: PaymentUpdate | InvoiceUpdate) => void) {
  const { toast } = useToast();

  const handleOrderUpdate = useCallback((payload: any) => {
    console.log('Real-time order update received:', payload);
    
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    if (eventType === 'UPDATE' && oldRecord?.payment_status !== newRecord?.payment_status) {
      const update: PaymentUpdate = {
        id: newRecord.id,
        payment_status: newRecord.payment_status,
        order_number: newRecord.order_number,
        customer_name: newRecord.customer_name,
        total_amount: newRecord.total_amount
      };

      if (newRecord.payment_status === 'paid') {
        toast({
          title: "Payment Received!",
          description: `Order ${newRecord.order_number} has been paid by ${newRecord.customer_name}`,
          duration: 5000,
        });
      }

      onPaymentUpdate?.(update);
    }
  }, [toast, onPaymentUpdate]);

  const handleInvoiceUpdate = useCallback((payload: any) => {
    console.log('Real-time invoice update received:', payload);
    
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    if (eventType === 'UPDATE' && oldRecord?.status !== newRecord?.status) {
      const update: InvoiceUpdate = {
        id: newRecord.id,
        status: newRecord.status,
        invoice_number: newRecord.invoice_number,
        amount: newRecord.amount,
        order_id: newRecord.order_id
      };

      if (newRecord.status === 'paid') {
        toast({
          title: "Invoice Paid!",
          description: `Invoice ${newRecord.invoice_number} has been paid`,
          duration: 5000,
        });
      }

      onPaymentUpdate?.(update);
    }
  }, [toast, onPaymentUpdate]);

  useEffect(() => {
    console.log('Setting up real-time payment subscriptions...');

    // Subscribe to order payment status changes
    const ordersChannel = supabase
      .channel('payment-orders-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: 'payment_status=in.(paid,invoiced,pending,overdue,cancelled)'
        },
        handleOrderUpdate
      )
      .subscribe();

    // Subscribe to invoice status changes
    const invoicesChannel = supabase
      .channel('payment-invoices-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: 'status=in.(paid,pending,failed,cancelled)'
        },
        handleInvoiceUpdate
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time payment subscriptions...');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [handleOrderUpdate, handleInvoiceUpdate]);

  return { supabase };
}
