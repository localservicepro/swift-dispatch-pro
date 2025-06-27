
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDeliveryPhotos(orderId: string | null) {
  return useQuery({
    queryKey: ['delivery-photos', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('delivery_photos')
        .select(`
          id,
          photo_url,
          photo_type,
          uploaded_at,
          driver_id,
          profiles!delivery_photos_driver_id_fkey(full_name)
        `)
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });
}
