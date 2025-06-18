
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CustomerPaymentMethod {
  id: string;
  customer_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last_four: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomerPaymentMethods(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-payment-methods', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_payment_methods')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        throw error;
      }

      return data as CustomerPaymentMethod[];
    },
    enabled: !!customerId,
  });
}
