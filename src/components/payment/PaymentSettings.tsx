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
import { Loader2, Save, Settings, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PaymentSettingsData {
  id?: string;
  gst_rate: number;
  service_charge_rate: number;
  gst_label: string;
  include_gst_in_prices: boolean;
  currency: string;
  default_delivery_fee: number;
  gst_enabled: boolean;
  stripe_test_publishable_key?: string;
  stripe_test_secret_key?: string;
  stripe_live_publishable_key?: string;
  stripe_live_secret_key?: string;
  stripe_webhook_secret?: string;
  stripe_mode: string;
  stripe_connection_status: string;
  delivery_markup_type: string;
  delivery_markup_value: number;
}

interface PaymentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentSettings({ isOpen, onClose }: PaymentSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [isTestingStripe, setIsTestingStripe] = useState(false);
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
        default_delivery_fee: 0.00,
        gst_enabled: true,
        stripe_mode: 'test',
        stripe_connection_status: 'not_configured',
        delivery_markup_type: 'percentage',
        delivery_markup_value: 0
      };
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
    stripe_mode: 'test',
    stripe_connection_status: 'not_configured'
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
        default_delivery_fee: settings.default_delivery_fee,
        gst_enabled: settings.gst_enabled,
        stripe_test_publishable_key: settings.stripe_test_publishable_key || '',
        stripe_test_secret_key: settings.stripe_test_secret_key || '',
        stripe_live_publishable_key: settings.stripe_live_publishable_key || '',
        stripe_live_secret_key: settings.stripe_live_secret_key || '',
        stripe_webhook_secret: settings.stripe_webhook_secret || '',
        stripe_mode: settings.stripe_mode || 'test',
        stripe_connection_status: settings.stripe_connection_status || 'not_configured'
      });
    }
  }, [settings]);

  const handleTestStripeConnection = async () => {
    setIsTestingStripe(true);
    
    try {
      const apiKey = formData.stripe_mode === 'test' 
        ? formData.stripe_test_secret_key 
        : formData.stripe_live_secret_key;

      if (!apiKey) {
        toast({
          title: "Error",
          description: "Please enter the secret key before testing",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: { 
          apiKey, 
          isLive: formData.stripe_mode === 'live' 
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: "Stripe connection successful!",
        });
        
        // Update connection status in form
        setFormData(prev => ({
          ...prev,
          stripe_connection_status: 'connected'
        }));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Stripe connection test failed:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Stripe",
        variant: "destructive",
      });
      
      setFormData(prev => ({
        ...prev,
        stripe_connection_status: 'error'
      }));
    } finally {
      setIsTestingStripe(false);
    }
  };

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

  const getConnectionStatusIcon = () => {
    switch (formData.stripe_connection_status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (formData.stripe_connection_status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      case 'testing':
        return 'Testing...';
      default:
        return 'Not Connected';
    }
  };

  if (!isOpen) return null;

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
              <p className="mt-2 text-slate-600">Loading settings...</p>
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
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      gst_enabled: checked
                    })}
                  />
                  <Label htmlFor="gst_enabled">Enable GST/Tax Calculation</Label>
                </div>
                
                {formData.gst_enabled && (
                  <>
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
                  </>
                )}
              </div>

              {/* Credit Card Surcharge */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Payment Processing</h3>
                
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
              </div>

              {/* Stripe Integration Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Stripe Integration</h3>
                  <div className="flex items-center space-x-2">
                    {getConnectionStatusIcon()}
                    <span className="text-sm text-muted-foreground">
                      {getConnectionStatusText()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode</Label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="test_mode"
                        name="stripe_mode"
                        value="test"
                        checked={formData.stripe_mode === 'test'}
                        onChange={(e) => setFormData({...formData, stripe_mode: e.target.value})}
                      />
                      <Label htmlFor="test_mode">Test Mode</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="live_mode"
                        name="stripe_mode"
                        value="live"
                        checked={formData.stripe_mode === 'live'}
                        onChange={(e) => setFormData({...formData, stripe_mode: e.target.value})}
                      />
                      <Label htmlFor="live_mode">Live Mode</Label>
                    </div>
                  </div>
                </div>

                {formData.stripe_mode === 'test' && (
                  <>
                    <div>
                      <Label htmlFor="stripe_test_publishable_key">Test Publishable Key</Label>
                      <Input
                        id="stripe_test_publishable_key"
                        type="text"
                        value={formData.stripe_test_publishable_key}
                        onChange={(e) => setFormData({...formData, stripe_test_publishable_key: e.target.value})}
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe_test_secret_key">Test Secret Key</Label>
                      <Input
                        id="stripe_test_secret_key"
                        type="password"
                        value={formData.stripe_test_secret_key}
                        onChange={(e) => setFormData({...formData, stripe_test_secret_key: e.target.value})}
                        placeholder="sk_test_..."
                      />
                    </div>
                  </>
                )}

                {formData.stripe_mode === 'live' && (
                  <>
                    <div>
                      <Label htmlFor="stripe_live_publishable_key">Live Publishable Key</Label>
                      <Input
                        id="stripe_live_publishable_key"
                        type="text"
                        value={formData.stripe_live_publishable_key}
                        onChange={(e) => setFormData({...formData, stripe_live_publishable_key: e.target.value})}
                        placeholder="pk_live_..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="stripe_live_secret_key">Live Secret Key</Label>
                      <Input
                        id="stripe_live_secret_key"
                        type="password"
                        value={formData.stripe_live_secret_key}
                        onChange={(e) => setFormData({...formData, stripe_live_secret_key: e.target.value})}
                        placeholder="sk_live_..."
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="stripe_webhook_secret">Webhook Secret (Optional)</Label>
                  <Input
                    id="stripe_webhook_secret"
                    type="password"
                    value={formData.stripe_webhook_secret}
                    onChange={(e) => setFormData({...formData, stripe_webhook_secret: e.target.value})}
                    placeholder="whsec_..."
                  />
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestStripeConnection}
                  disabled={isTestingStripe}
                  className="w-full"
                >
                  {isTestingStripe ? "Testing Connection..." : "Test Stripe Connection"}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Find your API keys in your{" "}
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Stripe Dashboard
                  </a>
                </p>
              </div>

              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">General Settings</h3>
                
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
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}