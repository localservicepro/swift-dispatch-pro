
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PricingTier {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  discount_percentage: number | null;
  is_default: boolean;
  is_active: boolean;
}

export function usePricingTiers() {
  return useQuery({
    queryKey: ['pricing-tiers'],
    queryFn: async () => {
      console.log('Fetching pricing tiers...');
      
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching pricing tiers:', error);
        throw error;
      }

      return data as PricingTier[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePricingTier() {
  return async (tier: Omit<PricingTier, 'id'>) => {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .insert(tier)
      .select()
      .single();

    if (error) throw error;
    return data;
  };
}
