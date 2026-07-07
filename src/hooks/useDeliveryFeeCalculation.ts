import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

interface SuburbDeliveryData {
  id: string;
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km: number | null;
}

/**
 * Hook to handle automatic delivery fee calculation from suburb data
 */
export function useDeliveryFeeCalculation() {
  const [suburb, setSuburb] = useState<SuburbDeliveryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: paymentSettings } = usePaymentSettings();

  /**
   * Parse delivery rate string to numeric value
   */
  const parseDeliveryRate = useCallback((deliveryRate: string): number => {
    if (!deliveryRate) return 0;
    const cleaned = deliveryRate.replace(/[AU$\s]/gi, '').trim();
    const numericValue = parseFloat(cleaned);
    return isNaN(numericValue) ? 0 : numericValue;
  }, []);

  /**
   * Apply delivery markup from payment settings
   */
  const applyMarkup = useCallback((baseFee: number): number => {
    if (!paymentSettings) return baseFee;
    const markupValue = paymentSettings.delivery_markup_value || 0;
    if (markupValue <= 0) return baseFee;

    if (paymentSettings.delivery_markup_type === 'fixed') {
      return baseFee + markupValue;
    }
    // percentage
    return baseFee + (baseFee * markupValue / 100);
  }, [paymentSettings]);

  /**
   * Fetch suburb data by ID
   */
  const fetchSuburbData = useCallback(async (suburbId: string) => {
    if (!suburbId) {
      setSuburb(null);
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('suburbs')
        .select('id, name, state, postcode, delivery_rate, distance_km')
        .eq('id', suburbId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching suburb data:', error);
        setSuburb(null);
        return null;
      }

      setSuburb(data);
      return data;
    } catch (error) {
      console.error('Error fetching suburb data:', error);
      setSuburb(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get auto-populated delivery fee from current suburb (with markup)
   */
  const getAutoDeliveryFee = useCallback((): number => {
    if (!suburb) return 0;
    const baseFee = parseDeliveryRate(suburb.delivery_rate);
    return applyMarkup(baseFee);
  }, [suburb, parseDeliveryRate, applyMarkup]);

  /**
   * Auto-populate delivery fee and show toast notification
   */
  const autoPopulateDeliveryFee = useCallback((
    suburbId: string,
    onDeliveryFeeChange: (fee: number, isAutoPopulated: boolean) => void
  ) => {
    fetchSuburbData(suburbId).then(suburbData => {
      if (suburbData) {
        const baseFee = parseDeliveryRate(suburbData.delivery_rate);
        const fee = applyMarkup(baseFee);
        
        if (fee > 0) {
          onDeliveryFeeChange(fee, true);
          
          const distanceText = suburbData.distance_km ? ` (${suburbData.distance_km}km away)` : '';
          const markupText = baseFee !== fee ? ` (incl. markup)` : '';
          
          toast({
            title: "Delivery Fee Auto-Populated",
            description: `Set to $${fee.toFixed(2)} based on ${suburbData.name} delivery rate${distanceText}${markupText}`,
            duration: 3000,
          });
        } else {
          console.log('No delivery rate found for suburb:', suburbData.name);
        }
      }
    });
  }, [fetchSuburbData, parseDeliveryRate, applyMarkup, toast]);

  /**
   * Get delivery fee info for display
   */
  const getDeliveryFeeInfo = useCallback(() => {
    if (!suburb) return null;
    
    const baseFee = parseDeliveryRate(suburb.delivery_rate);
    const fee = applyMarkup(baseFee);
    const distanceText = suburb.distance_km ? ` (${suburb.distance_km}km)` : '';
    
    return {
      suburbName: suburb.name,
      postcode: suburb.postcode,
      state: suburb.state,
      fee,
      originalRate: suburb.delivery_rate,
      distance: suburb.distance_km,
      displayText: `${suburb.name}${distanceText} - $${fee.toFixed(2)}`
    };
  }, [suburb, parseDeliveryRate, applyMarkup]);

  /**
   * Compute the final delivery fee (base rate + markup) from a raw
   * delivery_rate string. Use this whenever the UI needs to display or
   * store a fee derived from a suburb — it keeps client-side values in
   * lock-step with the server's authoritative recompute.
   */
  const computeFeeFromRate = useCallback((deliveryRate: string): number => {
    return applyMarkup(parseDeliveryRate(deliveryRate));
  }, [applyMarkup, parseDeliveryRate]);

  return {
    suburb,
    isLoading,
    fetchSuburbData,
    getAutoDeliveryFee,
    autoPopulateDeliveryFee,
    getDeliveryFeeInfo,
    parseDeliveryRate,
    applyMarkup,
    computeFeeFromRate,
  };
}
