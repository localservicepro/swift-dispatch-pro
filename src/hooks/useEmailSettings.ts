
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailSettings {
  id?: string;
  email_provider: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  admin_email: string;
  resend_api_key: string;
  connection_status: string;
  last_tested_at?: string;
}

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching email settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          email_provider: 'resend',
          sender_name: 'SwiftDispatch Pro',
          sender_email: 'updates@localservicepro.com.au',
          reply_to_email: 'support@localservicepro.com.au',
          admin_email: 'admin@localservicepro.com.au',
          resend_api_key: '',
          connection_status: 'disconnected'
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<EmailSettings>) => {
    setSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        ...newSettings,
        updated_at: new Date().toISOString()
      };

      let result;
      if (settings?.id) {
        result = await supabase
          .from('email_settings')
          .update(settingsToSave)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('email_settings')
          .insert(settingsToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setSettings(result.data);
      
      toast({
        title: "Settings Saved",
        description: "Email settings have been updated successfully.",
      });

      return result.data;
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings?.resend_api_key) {
      toast({
        title: "API Key Required",
        description: "Please add your Resend API key before testing.",
        variant: "destructive",
      });
      return false;
    }

    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'test-connection',
          data: {
            customerName: 'Test User',
            customerEmail: settings.sender_email,
            testMessage: 'This is a test email to verify your configuration.'
          }
        }
      });

      if (error) throw error;

      // Update connection status
      await saveSettings({
        connection_status: 'connected',
        last_tested_at: new Date().toISOString()
      });

      toast({
        title: "Connection Successful",
        description: "Email configuration is working correctly.",
      });

      return true;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      
      await saveSettings({
        connection_status: 'failed',
        last_tested_at: new Date().toISOString()
      });

      toast({
        title: "Connection Failed",
        description: "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });

      return false;
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    testing,
    saveSettings,
    testConnection,
    refetch: fetchSettings
  };
}
