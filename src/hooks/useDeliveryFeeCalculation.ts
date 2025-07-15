import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  /**
   * Parse delivery rate string to numeric value
   * Handles formats like "AU$40", "$40", "40.00", "40", etc.
   */
  const parseDeliveryRate = useCallback((deliveryRate: string): number => {
    if (!deliveryRate) return 0;
    
    // Remove currency symbols and whitespace
    const cleaned = deliveryRate.replace(/[AU$\s]/gi, '').trim();
    const numericValue = parseFloat(cleaned);
    
    return isNaN(numericValue) ? 0 : numericValue;
  }, []);

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
   * Get auto-populated delivery fee from current suburb
   */
  const getAutoDeliveryFee = useCallback((): number => {
    if (!suburb) return 0;
    return parseDeliveryRate(suburb.delivery_rate);
  }, [suburb, parseDeliveryRate]);

  /**
   * Auto-populate delivery fee and show toast notification
   */
  const autoPopulateDeliveryFee = useCallback((
    suburbId: string,
    onDeliveryFeeChange: (fee: number, isAutoPopulated: boolean) => void
  ) => {
    fetchSuburbData(suburbId).then(suburbData => {
      if (suburbData) {
        const fee = parseDeliveryRate(suburbData.delivery_rate);
        
        if (fee > 0) {
          onDeliveryFeeChange(fee, true);
          
          const distanceText = suburbData.distance_km ? ` (${suburbData.distance_km}km away)` : '';
          
          toast({
            title: "Delivery Fee Auto-Populated",
            description: `Set to $${fee.toFixed(2)} based on ${suburbData.name} delivery rate${distanceText}`,
            duration: 3000,
          });
        } else {
          console.log('No delivery rate found for suburb:', suburbData.name);
        }
      }
    });
  }, [fetchSuburbData, parseDeliveryRate, toast]);

  /**
   * Get delivery fee info for display
   */
  const getDeliveryFeeInfo = useCallback(() => {
    if (!suburb) return null;
    
    const fee = parseDeliveryRate(suburb.delivery_rate);
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
  }, [suburb, parseDeliveryRate]);

  return {
    suburb,
    isLoading,
    fetchSuburbData,
    getAutoDeliveryFee,
    autoPopulateDeliveryFee,
    getDeliveryFeeInfo,
    parseDeliveryRate
  };
}