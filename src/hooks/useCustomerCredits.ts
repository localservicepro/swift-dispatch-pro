import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerCredit {
  id: string;
  customer_id: string;
  source_order_id: string | null;
  amount: number;
  status: 'available' | 'used' | 'expired';
  created_from_return_id: string | null;
  used_in_order_id: string | null;
  description: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomerCredits(customerId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['customer-credits', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_credits')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer credits:', error);
        return [];
      }

      return data as CustomerCredit[];
    },
    enabled: !!customerId,
  });

  const applyCredit = useMutation({
    mutationFn: async ({ creditId, orderId, amountUsed }: { 
      creditId: string; 
      orderId: string; 
      amountUsed: number; 
    }) => {
      const { error } = await supabase.rpc('apply_credit_to_order', {
        credit_id_param: creditId,
        order_id_param: orderId,
        amount_used_param: amountUsed
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Credit Applied",
        description: "Customer credit has been applied to the order.",
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credits'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error applying credit:', error);
      toast({
        title: "Error",
        description: "Failed to apply credit. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Get available credits (not expired or used)
  const availableCredits = credits.filter(credit => 
    credit.status === 'available' && 
    (!credit.expires_at || new Date(credit.expires_at) > new Date())
  );

  // Calculate total available credit amount
  const totalAvailableCredit = availableCredits.reduce((sum, credit) => sum + credit.amount, 0);

  return {
    credits,
    availableCredits,
    totalAvailableCredit,
    isLoading,
    applyCredit: applyCredit.mutate,
    isApplyingCredit: applyCredit.isPending,
  };
}