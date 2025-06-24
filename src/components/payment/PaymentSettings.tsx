
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Settings } from "lucide-react";
import { StripeConfigurationSection } from "./StripeConfigurationSection";

interface PaymentSettingsData {
  id?: string;
  gst_rate: number;
  service_charge_rate: number;
  gst_label: string;
  include_gst_in_prices: boolean;
  currency: string;
  default_delivery_fee: number;
}

interface PaymentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentSettings({ isOpen, onClose }: PaymentSettingsProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current payment settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async (): Promise<PaymentSettingsData> => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      // Return default values if no settings exist
      return data || {
        gst_rate: 10.00,
        service_charge_rate: 0.00,
        gst_label: 'GST',
        include_gst_in_prices: true,
        currency: 'AUD',
        default_delivery_fee: 0.00
      };
    }
  });

  const [formData, setFormData] = useState<PaymentSettingsData>({
    gst_rate: 10.00,
    service_charge_rate: 0.00,
    gst_label: 'GST',
    include_gst_in_prices: true,
    currency: 'AUD',
    default_delivery_fee: 0.00
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        gst_rate: settings.gst_rate,
        service_charge_rate: settings.service_charge_rate,
        gst_label: settings.gst_label,
        include_gst_in_prices: settings.include_gst_in_prices,
        currency: settings.currency,
        default_delivery_fee: settings.default_delivery_fee
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('payment_settings')
          .update(settingsData)
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('payment_settings')
          .insert(settingsData);
        
        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Payment settings have been updated successfully",
      });

      // Refresh the settings
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to save payment settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStripeSettingsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg">
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Payment Settings
            </h2>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="mt-2 text-slate-600">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* Stripe Configuration */}
              <StripeConfigurationSection 
                settings={settings} 
                onSettingsUpdate={handleStripeSettingsUpdate}
              />

              {/* GST Settings */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <CardTitle className="text-lg font-semibold text-slate-800">Tax Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gst_rate">GST Rate (%)</Label>
                      <Input
                        id="gst_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.gst_rate}
                        onChange={(e) => setFormData({
                          ...formData,
                          gst_rate: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gst_label">GST Label</Label>
                      <Input
                        id="gst_label"
                        value={formData.gst_label}
                        onChange={(e) => setFormData({
                          ...formData,
                          gst_label: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include_gst"
                      checked={formData.include_gst_in_prices}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        include_gst_in_prices: checked
                      })}
                    />
                    <Label htmlFor="include_gst">Include GST in displayed prices</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Card Surcharge */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <CardTitle className="text-lg font-semibold text-slate-800">Payment Processing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label htmlFor="service_charge_rate">Credit Card Surcharge (%)</Label>
                    <Input
                      id="service_charge_rate"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={formData.service_charge_rate}
                      onChange={(e) => setFormData({
                        ...formData,
                        service_charge_rate: parseFloat(e.target.value) || 0
                      })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Additional fee charged for credit card payments
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* General Settings */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <CardTitle className="text-lg font-semibold text-slate-800">General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={formData.currency} 
                        onValueChange={(value) => setFormData({
                          ...formData,
                          currency: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="default_delivery_fee">Default Delivery Fee</Label>
                      <Input
                        id="default_delivery_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.default_delivery_fee}
                        onChange={(e) => setFormData({
                          ...formData,
                          default_delivery_fee: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>

                  {/* Action Button for General Settings */}
                  <div className="pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save General Settings
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
