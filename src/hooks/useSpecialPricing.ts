
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProductSpecial {
  special_id: string;
  special_name: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  end_date: string;
}

export function useSpecialPricing() {
  const [specials, setSpecials] = useState<Map<string, ProductSpecial>>(new Map());
  const [loading, setLoading] = useState(false);

  const getActiveSpecialForProduct = async (productId: string, customerTier: string = 'trade') => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_specials_for_product', {
          product_id_param: productId,
          customer_tier_param: customerTier
        });

      if (error) {
        console.error('Error fetching special:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching special:', error);
      return null;
    }
  };

  const calculateSpecialPrice = async (basePrice: number, productId: string, customerTier: string = 'trade') => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_special_price', {
          base_price: basePrice,
          product_id_param: productId,
          customer_tier_param: customerTier
        });

      if (error) {
        console.error('Error calculating special price:', error);
        return basePrice;
      }

      return data || basePrice;
    } catch (error) {
      console.error('Error calculating special price:', error);
      return basePrice;
    }
  };

  const loadSpecialsForProducts = async (productIds: string[], customerTier: string = 'trade') => {
    setLoading(true);
    const specialsMap = new Map<string, ProductSpecial>();

    try {
      for (const productId of productIds) {
        const special = await getActiveSpecialForProduct(productId, customerTier);
        if (special) {
          specialsMap.set(productId, special);
        }
      }
      setSpecials(specialsMap);
    } catch (error) {
      console.error('Error loading specials for products:', error);
    }

    setLoading(false);
  };

  const hasActiveSpecial = (productId: string) => {
    return specials.has(productId);
  };

  const getSpecialForProduct = (productId: string) => {
    return specials.get(productId);
  };

  const applySpecialDiscount = (price: number, productId: string) => {
    const special = specials.get(productId);
    if (!special) return price;

    if (special.discount_type === 'percentage') {
      return price * (1 - special.discount_value / 100);
    } else {
      return Math.max(0, price - special.discount_value);
    }
  };

  return {
    specials,
    loading,
    getActiveSpecialForProduct,
    calculateSpecialPrice,
    loadSpecialsForProducts,
    hasActiveSpecial,
    getSpecialForProduct,
    applySpecialDiscount
  };
}
