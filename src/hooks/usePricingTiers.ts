
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
    // Check if we have any active tiers
    if (!tiers || tiers.length === 0) {
      console.log('No active pricing tiers found');
      return { showTiers: false, prices: {} };
    }

    // Check if there are any tiers that are actually active
    const activeTiers = tiers.filter(tier => tier.is_active);
    if (activeTiers.length === 0) {
      console.log('No active pricing tiers available');
      return { showTiers: false, prices: {} };
    }

    console.log('Calculating tier prices for active tiers:', activeTiers.length);

    const prices: Record<string, { original: number; special?: number }> = {};
    
    activeTiers.forEach(tier => {
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
