import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BusinessSettings {
  id?: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_website?: string;
  business_address?: string;
  logo_url?: string;
  abn?: string;
  tax_number?: string;
  registration_number?: string;
}

export const useBusinessSettings = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // No settings exist, create default
        setSettings({
          business_name: 'SwiftDispatch Pro',
          business_email: 'info@swiftdispatch.com.au',
          business_phone: '+61 2 9876 5432',
        });
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
      toast({
        title: "Error",
        description: "Failed to load business settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: Partial<BusinessSettings>) => {
    try {
      setSaving(true);
      
      if (!settings) return;

      const settingsToSave = { ...settings, ...updatedSettings };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('business_settings')
          .update(settingsToSave)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('business_settings')
          .insert(settingsToSave)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      setSettings(settingsToSave);
      
      toast({
        title: "Success",
        description: "Business settings saved successfully",
      });

      return true;
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast({
        title: "Error",
        description: "Failed to save business settings",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
  };
};