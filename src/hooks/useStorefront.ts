import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStorefront(slug: string) {
  return useQuery({
    queryKey: ['storefront', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_stores')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Store not found');

      return data;
    },
    retry: false,
    enabled: !!slug && slug !== 'account-portal' && slug !== 'account-login',
  });
}
