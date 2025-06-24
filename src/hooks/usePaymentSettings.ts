
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PaymentSettings {
  id: string;
  gst_rate: number;
  service_charge_rate: number;
  currency: string;
  gst_label: string;
  include_gst_in_prices: boolean;
  default_delivery_fee: number;
  stripe_test_publishable_key?: string;
  stripe_test_secret_key?: string;
  stripe_live_publishable_key?: string;
  stripe_live_secret_key?: string;
  stripe_mode: 'test' | 'live';
  stripe_webhook_secret?: string;
  stripe_connection_status: 'not_configured' | 'connected' | 'error' | 'testing';
  stripe_last_tested_at?: string;
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      console.log('Fetching payment settings...');
      
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching payment settings:', error);
        throw error;
      }

      // Return default settings if none exist
      const defaultSettings: PaymentSettings = {
        id: '',
        gst_rate: 10.00,
        service_charge_rate: 1.50,
        currency: 'AUD',
        gst_label: 'GST',
        include_gst_in_prices: false,
        default_delivery_fee: 0.00,
        stripe_mode: 'test',
        stripe_connection_status: 'not_configured'
      };

      return data || defaultSettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
  });
}
