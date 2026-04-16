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
import { Loader2, Save, Settings, CheckCircle, AlertCircle } from "lucide-react";

interface PaymentSettingsData {
  id?: string;
  gst_rate: number;
  service_charge_rate: number;
  gst_label: string;
  include_gst_in_prices: boolean;
  currency: string;
  default_delivery_fee: number;
  gst_enabled: boolean;
  delivery_markup_type: string;
  delivery_markup_value: number;
  fuel_surcharge: number;
}

interface PaymentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentSettings({ isOpen, onClose }: PaymentSettingsProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async (): Promise<PaymentSettingsData> => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('id, gst_rate, service_charge_rate, gst_label, include_gst_in_prices, currency, default_delivery_fee, gst_enabled, delivery_markup_type, delivery_markup_value, fuel_surcharge')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || {
        gst_rate: 10.00,
        service_charge_rate: 0.00,
        gst_label: 'GST',
        include_gst_in_prices: true,
        currency: 'AUD',
        default_delivery_fee: 0.00,
        gst_enabled: true,
        delivery_markup_type: 'percentage',
        delivery_markup_value: 0,
        fuel_surcharge: 5.00
      };
    }
  });

  const { data: myobSettings } = useQuery({
    queryKey: ['myob-connection-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('myob_settings')
        .select('connection_status')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const [formData, setFormData] = useState<PaymentSettingsData>({
    gst_rate: 10.00,
    service_charge_rate: 0.00,
    gst_label: 'GST',
    include_gst_in_prices: true,
    currency: 'AUD',
    default_delivery_fee: 0.00,
    gst_enabled: true,
    delivery_markup_type: 'percentage',
    delivery_markup_value: 0,
    fuel_surcharge: 5.00
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        gst_rate: settings.gst_rate,
        service_charge_rate: settings.service_charge_rate,
        gst_label: settings.gst_label,
        include_gst_in_prices: settings.include_gst_in_prices,
        currency: settings.currency,
        default_delivery_fee: settings.default_delivery_fee,
        gst_enabled: settings.gst_enabled,
        delivery_markup_type: settings.delivery_markup_type || 'percentage',
        delivery_markup_value: settings.delivery_markup_value || 0,
        fuel_surcharge: settings.fuel_surcharge ?? 5.00
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
        const { error } = await supabase
          .from('payment_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_settings')
          .insert(settingsData);
        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Payment settings have been updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      onClose();
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

  if (!isOpen) return null;

  const myobConnected = myobSettings?.connection_status === 'connected';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Payment Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading settings...</p>
            </div>
          ) : (
            <>
              {/* GST Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tax Settings</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="gst_enabled"
                    checked={formData.gst_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, gst_enabled: checked })}
                  />
                  <Label htmlFor="gst_enabled">Enable GST/Tax Calculation</Label>
                </div>
                {formData.gst_enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="gst_rate">GST Rate (%)</Label>
                        <Input id="gst_rate" type="number" min="0" max="100" step="0.01" value={formData.gst_rate} onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label htmlFor="gst_label">GST Label</Label>
                        <Input id="gst_label" value={formData.gst_label} onChange={(e) => setFormData({ ...formData, gst_label: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="include_gst" checked={formData.include_gst_in_prices} onCheckedChange={(checked) => setFormData({ ...formData, include_gst_in_prices: checked })} />
                      <Label htmlFor="include_gst">Include GST in displayed prices</Label>
                    </div>
                  </>
                )}
              </div>

              {/* Credit Card Surcharge */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Processing</h3>
                <div>
                  <Label htmlFor="service_charge_rate">Credit Card Surcharge (%)</Label>
                  <Input id="service_charge_rate" type="number" min="0" max="10" step="0.01" value={formData.service_charge_rate} onChange={(e) => setFormData({ ...formData, service_charge_rate: parseFloat(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground mt-1">Additional fee charged for credit card payments</p>
                </div>
              </div>

              {/* MYOB Integration Status */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">MYOB Integration</h3>
                  <div className="flex items-center space-x-2">
                    {myobConnected ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {myobConnected ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure MYOB credentials and connection in{" "}
                  <span className="font-medium text-foreground">Settings → MYOB AccountRight Integration</span>.
                </p>
              </div>

              {/* Delivery Markup */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery Markup</h3>
                <p className="text-sm text-muted-foreground">Apply a markup on top of all suburb-based delivery fees</p>
                <div className="space-y-2">
                  <Label>Markup Type</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="markup_percentage" name="delivery_markup_type" value="percentage" checked={formData.delivery_markup_type === 'percentage'} onChange={(e) => setFormData({ ...formData, delivery_markup_type: e.target.value })} />
                      <Label htmlFor="markup_percentage">Percentage (%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="markup_fixed" name="delivery_markup_type" value="fixed" checked={formData.delivery_markup_type === 'fixed'} onChange={(e) => setFormData({ ...formData, delivery_markup_type: e.target.value })} />
                      <Label htmlFor="markup_fixed">Fixed Amount ($)</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="delivery_markup_value">Markup Value {formData.delivery_markup_type === 'percentage' ? '(%)' : '($)'}</Label>
                  <Input id="delivery_markup_value" type="number" min="0" step="0.01" value={formData.delivery_markup_value} onChange={(e) => setFormData({ ...formData, delivery_markup_value: parseFloat(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.delivery_markup_type === 'percentage' ? 'E.g. 10% markup on a $50 delivery fee = $55' : 'E.g. $5 markup on a $50 delivery fee = $55'}
                  </p>
                </div>
              </div>

              {/* Fuel Surcharge */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Fuel Surcharge</h3>
                <p className="text-sm text-muted-foreground">Flat surcharge applied to every delivery order</p>
                <div>
                  <Label htmlFor="fuel_surcharge">Fuel Surcharge ($)</Label>
                  <Input id="fuel_surcharge" type="number" min="0" step="0.01" value={formData.fuel_surcharge} onChange={(e) => setFormData({ ...formData, fuel_surcharge: parseFloat(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground mt-1">Added on top of the delivery fee for each delivery order (default: $5.00)</p>
                </div>
              </div>

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">General Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input id="default_delivery_fee" type="number" min="0" step="0.01" value={formData.default_delivery_fee} onChange={(e) => setFormData({ ...formData, default_delivery_fee: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="w-4 h-4 mr-2" />Save Settings</>)}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
