
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDetails {
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
    due_date: string;
    customer_email: string;
    paid_at?: string;
    payment_url?: string;
  } | null;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_address: string;
    total_amount: number;
    status: string;
    payment_status: string;
    delivery_date?: string;
  } | null;
  loading: boolean;
  error: string | null;
}

export function usePaymentDetails(invoiceId: string | null) {
  const [details, setDetails] = useState<PaymentDetails>({
    invoice: null,
    order: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!invoiceId) {
      setDetails(prev => ({ ...prev, loading: false, error: "No invoice ID provided" }));
      return;
    }

    const fetchPaymentDetails = async () => {
      try {
        console.log('Fetching payment details for invoice:', invoiceId);
        
        // Fetch invoice details
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (invoiceError) {
          console.error('Error fetching invoice:', invoiceError);
          throw new Error('Failed to fetch invoice details');
        }

        let order = null;
        if (invoice?.order_id) {
          // Fetch order details
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', invoice.order_id)
            .single();

          if (orderError) {
            console.error('Error fetching order:', orderError);
            // Don't throw error for order fetch failure, just log it
          } else {
            order = orderData;
          }
        }

        setDetails({
          invoice,
          order,
          loading: false,
          error: null
        });

      } catch (error: any) {
        console.error('Error fetching payment details:', error);
        setDetails({
          invoice: null,
          order: null,
          loading: false,
          error: error.message || 'Failed to fetch payment details'
        });
      }
    };

    fetchPaymentDetails();
  }, [invoiceId]);

  return details;
}
