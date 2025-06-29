
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PricingTier {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  discount_percentage: number | null;
  percentage_adjustment: number | null;
  is_markup: boolean | null;
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

export function useDynamicPricing() {
  const { data: tiers, isLoading } = usePricingTiers();

  const calculateTierPrices = (basePrice: number) => {
    if (!tiers || tiers.length === 0) {
      return { showTiers: false, prices: {} };
    }

    const prices: Record<string, { original: number; special?: number }> = {};
    
    tiers.forEach(tier => {
      const adjustment = tier.percentage_adjustment || 0;
      let calculatedPrice = basePrice;
      
      if (tier.is_markup) {
        calculatedPrice = basePrice * (1 + adjustment / 100);
      } else {
        calculatedPrice = basePrice * (1 - adjustment / 100);
      }
      
      prices[tier.name] = {
        original: calculatedPrice
      };
    });

    return {
      showTiers: true,
      prices
    };
  };

  return {
    calculateTierPrices,
    isLoading,
    tiers: tiers || []
  };
}
