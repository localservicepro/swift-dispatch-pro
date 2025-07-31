import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StockStatus {
  hasMixedStock: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStockStatus(orderId: string | null): StockStatus {
  const [hasMixedStock, setHasMixedStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setHasMixedStock(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    const checkMixedStock = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.rpc('has_mixed_stock_availability', {
          order_id_param: orderId
        });

        if (error) throw error;
        setHasMixedStock(data || false);
      } catch (err: any) {
        console.error('Error checking mixed stock:', err);
        setError(err.message);
        setHasMixedStock(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMixedStock();
  }, [orderId]);

  return { hasMixedStock, isLoading, error };
}