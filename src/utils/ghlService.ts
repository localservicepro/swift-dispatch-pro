
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
    try {
      // Use raw query to avoid type issues for now
      const { data, error } = await supabase
        .rpc('get_ghl_settings');

      if (error) throw error;
      return data || { connection_status: 'disconnected', auto_sync_customers: false, auto_sync_orders: false };
    } catch (error) {
      console.error('Error getting GHL settings:', error);
      return { connection_status: 'disconnected', auto_sync_customers: false, auto_sync_orders: false };
    }
  },

  async updateSettings(settings: any) {
    try {
      const { data, error } = await supabase.functions.invoke('update-ghl-settings', {
        body: settings
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating GHL settings:', error);
      throw error;
    }
  },

  async getSyncLogs() {
    try {
      const { data, error } = await supabase
        .rpc('get_ghl_sync_logs');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  }
};
