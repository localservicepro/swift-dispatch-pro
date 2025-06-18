
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, DollarSign, TestTube, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface PaymentSettings {
  id: string;
  gst_rate: number;
  default_delivery_fee: number;
  service_charge_rate: number;
  currency: string;
  include_gst_in_prices: boolean;
  gst_label: string;
}

interface StripeSettings {
  id: string;
  test_publishable_key: string | null;
  test_secret_key: string | null;
  live_publishable_key: string | null;
  live_secret_key: string | null;
  is_live_mode: boolean;
  connection_status: string;
  last_tested_at: string | null;
}

export function PaymentSettings() {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [stripeSettings, setStripeSettings] = useState<StripeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [paymentResult, stripeResult] = await Promise.all([
        supabase.from('payment_settings').select('*').single(),
        supabase.from('stripe_settings').select('*').single()
      ]);

      if (paymentResult.data) {
        setPaymentSettings(paymentResult.data);
      }

      if (stripeResult.data) {
        setStripeSettings(stripeResult.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePaymentSettings = async () => {
    if (!paymentSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update({
          gst_rate: paymentSettings.gst_rate,
          default_delivery_fee: paymentSettings.default_delivery_fee,
          service_charge_rate: paymentSettings.service_charge_rate,
          currency: paymentSettings.currency,
          include_gst_in_prices: paymentSettings.include_gst_in_prices,
          gst_label: paymentSettings.gst_label,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentSettings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to save payment settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveStripeSettings = async () => {
    if (!stripeSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stripe_settings')
        .update({
          test_publishable_key: stripeSettings.test_publishable_key,
          test_secret_key: stripeSettings.test_secret_key,
          live_publishable_key: stripeSettings.live_publishable_key,
          live_secret_key: stripeSettings.live_secret_key,
          is_live_mode: stripeSettings.is_live_mode,
          updated_at: new Date().toISOString()
        })
        .eq('id', stripeSettings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Stripe settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving Stripe settings:', error);
      toast({
        title: "Error",
        description: "Failed to save Stripe settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testStripeConnection = async () => {
    if (!stripeSettings) return;

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: {
          publishable_key: stripeSettings.is_live_mode 
            ? stripeSettings.live_publishable_key 
            : stripeSettings.test_publishable_key,
          secret_key: stripeSettings.is_live_mode 
            ? stripeSettings.live_secret_key 
            : stripeSettings.test_secret_key,
          is_live_mode: stripeSettings.is_live_mode
        }
      });

      if (error) throw error;

      const connectionStatus = data.success ? 'connected' : 'error';
      
      // Update connection status in database
      await supabase
        .from('stripe_settings')
        .update({
          connection_status: connectionStatus,
          last_tested_at: new Date().toISOString()
        })
        .eq('id', stripeSettings.id);

      setStripeSettings(prev => prev ? {
        ...prev,
        connection_status: connectionStatus,
        last_tested_at: new Date().toISOString()
      } : null);

      toast({
        title: data.success ? "Success" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      toast({
        title: "Error",
        description: "Failed to test Stripe connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fee Configuration */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Fee Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {paymentSettings && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={paymentSettings.gst_rate}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      gst_rate: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="gst_label">GST Label</Label>
                  <Input
                    id="gst_label"
                    value={paymentSettings.gst_label}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      gst_label: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_fee">Default Delivery Fee</Label>
                  <Input
                    id="delivery_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentSettings.default_delivery_fee}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      default_delivery_fee: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="service_charge">Service Charge Rate (%)</Label>
                  <Input
                    id="service_charge"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={paymentSettings.service_charge_rate}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      service_charge_rate: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={paymentSettings.currency}
                    onChange={(e) => setPaymentSettings({
                      ...paymentSettings,
                      currency: e.target.value.toUpperCase()
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="include_gst">Include GST in Prices</Label>
                    <p className="text-sm text-slate-500">Show prices with GST included</p>
                  </div>
                  <Switch
                    id="include_gst"
                    checked={paymentSettings.include_gst_in_prices}
                    onCheckedChange={(checked) => setPaymentSettings({
                      ...paymentSettings,
                      include_gst_in_prices: checked
                    })}
                  />
                </div>
              </div>

              <Button 
                onClick={savePaymentSettings}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Fee Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stripe Integration */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Stripe Integration
            {stripeSettings && (
              <Badge 
                variant={stripeSettings.connection_status === 'connected' ? 'default' : 'destructive'}
                className="ml-2"
              >
                {stripeSettings.connection_status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                {stripeSettings.connection_status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                {stripeSettings.connection_status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {stripeSettings && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label>Environment Mode</Label>
                  <p className="text-sm text-slate-500">
                    {stripeSettings.is_live_mode ? 'Live Mode - Real payments will be processed' : 'Test Mode - Safe for testing'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  <Switch
                    checked={stripeSettings.is_live_mode}
                    onCheckedChange={(checked) => setStripeSettings({
                      ...stripeSettings,
                      is_live_mode: checked
                    })}
                  />
                  <span className="text-sm font-medium">Live</span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">
                  {stripeSettings.is_live_mode ? 'Live' : 'Test'} API Keys
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Publishable Key</Label>
                    <Input
                      type="text"
                      placeholder={`pk_${stripeSettings.is_live_mode ? 'live' : 'test'}_...`}
                      value={stripeSettings.is_live_mode ? stripeSettings.live_publishable_key || '' : stripeSettings.test_publishable_key || ''}
                      onChange={(e) => {
                        if (stripeSettings.is_live_mode) {
                          setStripeSettings({
                            ...stripeSettings,
                            live_publishable_key: e.target.value
                          });
                        } else {
                          setStripeSettings({
                            ...stripeSettings,
                            test_publishable_key: e.target.value
                          });
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label>Secret Key</Label>
                    <Input
                      type="password"
                      placeholder={`sk_${stripeSettings.is_live_mode ? 'live' : 'test'}_...`}
                      value={stripeSettings.is_live_mode ? stripeSettings.live_secret_key || '' : stripeSettings.test_secret_key || ''}
                      onChange={(e) => {
                        if (stripeSettings.is_live_mode) {
                          setStripeSettings({
                            ...stripeSettings,
                            live_secret_key: e.target.value
                          });
                        } else {
                          setStripeSettings({
                            ...stripeSettings,
                            test_secret_key: e.target.value
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                {stripeSettings.last_tested_at && (
                  <p className="text-sm text-slate-500">
                    Last tested: {new Date(stripeSettings.last_tested_at).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={testStripeConnection}
                    disabled={testing}
                    variant="outline"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                    Test Connection
                  </Button>
                  
                  <Button 
                    onClick={saveStripeSettings}
                    disabled={saving}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Stripe Settings
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
