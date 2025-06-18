
import { supabase } from "@/integrations/supabase/client";

export const ghlService = {
  async syncCustomer(customer: any) {
    try {
      const { data, error } = await supabase.functions.invoke('sync-customer-to-ghl', {
        body: { customer }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing customer to GHL:', error);
      throw error;
    }
  },

  async syncOrder(order: any) {
    try {
      const { data, error } = await supabase.functions.invoke('sync-order-to-ghl', {
        body: { order }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing order to GHL:', error);
      throw error;
    }
  },

  async testConnection(apiKey: string, locationId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('test-ghl-connection', {
        body: { api_key: apiKey, location_id: locationId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error testing GHL connection:', error);
      throw error;
    }
  },

  async getSettings() {
    const { data, error } = await supabase
      .from('ghl_settings')
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateSettings(settings: any) {
    const { data, error } = await supabase
      .from('ghl_settings')
      .update(settings)
      .eq('id', settings.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSyncLogs() {
    const { data, error } = await supabase
      .from('ghl_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }
};
