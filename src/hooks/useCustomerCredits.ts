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
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  const updateCredit = useMutation({
    mutationFn: async ({ creditId, amount, description, expires_at, status }: {
      creditId: string;
      amount: number;
      description: string;
      expires_at: string | null;
      status: string;
    }) => {
      const { error } = await supabase
        .from('customer_credits')
        .update({
          amount,
          description,
          expires_at,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Credit Updated",
        description: "Customer credit has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credits'] });
    },
    onError: (error) => {
      console.error('Error updating credit:', error);
      toast({
        title: "Error",
        description: "Failed to update credit. Please try again.",
        variant: "destructive"
      });
    },
  });

  const createManualCredit = useMutation({
    mutationFn: async ({ customerId, amount, description, expires_at }: {
      customerId: string;
      amount: number;
      description: string;
      expires_at: string | null;
    }) => {
      const { error } = await supabase
        .from('customer_credits')
        .insert({
          customer_id: customerId,
          amount,
          description,
          expires_at,
          status: 'available'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Credit Created",
        description: "Manual credit has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credits'] });
    },
    onError: (error) => {
      console.error('Error creating manual credit:', error);
      toast({
        title: "Error",
        description: "Failed to create credit. Please try again.",
        variant: "destructive"
      });
    },
  });

  const expireCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase
        .from('customer_credits')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', creditId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Credit Expired",
        description: "Customer credit has been marked as expired.",
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credits'] });
    },
    onError: (error) => {
      console.error('Error expiring credit:', error);
      toast({
        title: "Error",
        description: "Failed to expire credit. Please try again.",
        variant: "destructive"
      });
    },
  });

  const deleteCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase
        .from('customer_credits')
        .delete()
        .eq('id', creditId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Credit Deleted",
        description: "Customer credit has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credits'] });
    },
    onError: (error) => {
      console.error('Error deleting credit:', error);
      toast({
        title: "Error",
        description: "Failed to delete credit. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    credits,
    availableCredits,
    totalAvailableCredit,
    isLoading,
    applyCredit: applyCredit.mutate,
    isApplyingCredit: applyCredit.isPending,
    updateCredit: updateCredit.mutate,
    createManualCredit: createManualCredit.mutate,
    expireCredit: expireCredit.mutate,
    deleteCredit: deleteCredit.mutate,
    isUpdating: updateCredit.isPending,
    isCreating: createManualCredit.isPending,
  };
}