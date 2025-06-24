
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Eye, EyeOff, TestTube, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";

interface StripeConfig {
  stripe_test_publishable_key: string;
  stripe_test_secret_key: string;
  stripe_live_publishable_key: string;
  stripe_live_secret_key: string;
  stripe_mode: 'test' | 'live';
  stripe_webhook_secret: string;
}

interface StripeConfigurationSectionProps {
  settings: any;
  onSettingsUpdate: () => void;
}

export function StripeConfigurationSection({ settings, onSettingsUpdate }: StripeConfigurationSectionProps) {
  const [config, setConfig] = useState<StripeConfig>({
    stripe_test_publishable_key: '',
    stripe_test_secret_key: '',
    stripe_live_publishable_key: '',
    stripe_live_secret_key: '',
    stripe_mode: 'test',
    stripe_webhook_secret: ''
  });

  const [showKeys, setShowKeys] = useState({
    testSecret: false,
    liveSecret: false,
    webhook: false
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  // Update config when settings change
  useEffect(() => {
    if (settings) {
      setConfig({
        stripe_test_publishable_key: settings.stripe_test_publishable_key || '',
        stripe_test_secret_key: settings.stripe_test_secret_key || '',
        stripe_live_publishable_key: settings.stripe_live_publishable_key || '',
        stripe_live_secret_key: settings.stripe_live_secret_key || '',
        stripe_mode: settings.stripe_mode || 'test',
        stripe_webhook_secret: settings.stripe_webhook_secret || ''
      });
    }
  }, [settings]);

  const getConnectionStatusBadge = () => {
    const status = settings?.stripe_connection_status || 'not_configured';
    
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Connected
        </Badge>;
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Error
        </Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-800">Testing...</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Configured</Badge>;
    }
  };

  const validateCurrentModeKeys = () => {
    if (config.stripe_mode === 'test') {
      return config.stripe_test_publishable_key && config.stripe_test_secret_key;
    } else {
      return config.stripe_live_publishable_key && config.stripe_live_secret_key;
    }
  };

  const getCurrentModeKeys = () => {
    if (config.stripe_mode === 'test') {
      return {
        publishableKey: config.stripe_test_publishable_key,
        secretKey: config.stripe_test_secret_key
      };
    } else {
      return {
        publishableKey: config.stripe_live_publishable_key,
        secretKey: config.stripe_live_secret_key
      };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = {
        ...config,
        stripe_connection_status: 'not_configured',
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
        title: "Stripe Settings Saved",
        description: "Stripe configuration has been updated successfully",
      });

      onSettingsUpdate();
    } catch (error: any) {
      console.error('Error saving Stripe settings:', error);
      toast({
        title: "Error",
        description: "Failed to save Stripe settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateCurrentModeKeys()) {
      toast({
        title: "Missing Keys",
        description: `Please enter both publishable and secret keys for ${config.stripe_mode} mode`,
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      // Update connection status to testing
      if (settings?.id) {
        await supabase
          .from('payment_settings')
          .update({ stripe_connection_status: 'testing' })
          .eq('id', settings.id);
        onSettingsUpdate();
      }

      // First save the current config
      await handleSave();
      
      // Get the keys for the current mode
      const { publishableKey, secretKey } = getCurrentModeKeys();
      
      console.log(`Testing Stripe connection in ${config.stripe_mode} mode...`);
      console.log('Publishable key:', publishableKey.substring(0, 12) + '...');
      console.log('Secret key:', secretKey.substring(0, 12) + '...');
      
      // Test the connection using the appropriate keys for the current mode
      const { data, error } = await supabase.functions.invoke('test-stripe-connection', {
        body: {
          publishableKey,
          secretKey,
          mode: config.stripe_mode
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message || 'Failed to invoke connection test function');
      }

      if (data?.success) {
        toast({
          title: "Connection Successful",
          description: `Stripe ${config.stripe_mode} mode connection verified successfully. Account: ${data.businessProfile || data.accountId}`,
        });
        console.log('Connection successful:', data);
      } else {
        console.error('Connection test failed:', data);
        throw new Error(data?.error || data?.details || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Stripe connection test failed:', error);
      
      // Show more detailed error message
      let errorTitle = "Connection Failed";
      let errorDescription = `Failed to connect to Stripe in ${config.stripe_mode} mode.`;
      
      if (error.message) {
        if (error.message.includes('Invalid') && error.message.includes('key')) {
          errorTitle = "Invalid API Keys";
          errorDescription = "Please check that your Stripe API keys are correct and match the selected mode.";
        } else if (error.message.includes('permissions')) {
          errorTitle = "Permission Error";
          errorDescription = "Your Stripe API keys don't have sufficient permissions.";
        } else if (error.message.includes('format')) {
          errorTitle = "Key Format Error";
          errorDescription = error.message;
        } else {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
      // Refresh settings to get updated connection status
      setTimeout(() => onSettingsUpdate(), 1000);
    }
  };

  const toggleKeyVisibility = (keyType: 'testSecret' | 'liveSecret' | 'webhook') => {
    setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }));
  };

  const maskKey = (key: string, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const handleKeyChange = (field: keyof StripeConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Stripe Configuration
          </div>
          {getConnectionStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div>
            <Label htmlFor="stripe_mode" className="font-medium">Stripe Mode</Label>
            <p className="text-sm text-yellow-800 mt-1">
              {config.stripe_mode === 'test' ? 'Test mode - Safe for development' : 'Live mode - Real transactions'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${config.stripe_mode === 'test' ? 'font-semibold' : ''}`}>Test</span>
            <Switch
              id="stripe_mode"
              checked={config.stripe_mode === 'live'}
              onCheckedChange={(checked) => handleKeyChange('stripe_mode', checked ? 'live' : 'test')}
            />
            <span className={`text-sm ${config.stripe_mode === 'live' ? 'font-semibold' : ''}`}>Live</span>
          </div>
        </div>

        {/* Test Keys Section */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-700 border-b pb-2">Test API Keys</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="test_publishable">Test Publishable Key</Label>
              <Input
                id="test_publishable"
                placeholder="pk_test_..."
                value={config.stripe_test_publishable_key}
                onChange={(e) => handleKeyChange('stripe_test_publishable_key', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="test_secret">Test Secret Key</Label>
              <div className="relative">
                <Input
                  id="test_secret"
                  type={showKeys.testSecret ? "text" : "password"}
                  placeholder="sk_test_..."
                  value={config.stripe_test_secret_key}
                  onChange={(e) => handleKeyChange('stripe_test_secret_key', e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleKeyVisibility('testSecret')}
                >
                  {showKeys.testSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Keys Section */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-700 border-b pb-2">Live API Keys</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="live_publishable">Live Publishable Key</Label>
              <Input
                id="live_publishable"
                placeholder="pk_live_..."
                value={config.stripe_live_publishable_key}
                onChange={(e) => handleKeyChange('stripe_live_publishable_key', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="live_secret">Live Secret Key</Label>
              <div className="relative">
                <Input
                  id="live_secret"
                  type={showKeys.liveSecret ? "text" : "password"}
                  placeholder="sk_live_..."
                  value={config.stripe_live_secret_key}
                  onChange={(e) => handleKeyChange('stripe_live_secret_key', e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleKeyVisibility('liveSecret')}
                >
                  {showKeys.liveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-700 border-b pb-2">Webhook Configuration</h3>
          
          <div>
            <Label htmlFor="webhook_secret">Webhook Signing Secret</Label>
            <div className="relative">
              <Input
                id="webhook_secret"
                type={showKeys.webhook ? "text" : "password"}
                placeholder="whsec_..."
                value={config.stripe_webhook_secret}
                onChange={(e) => handleKeyChange('stripe_webhook_secret', e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleKeyVisibility('webhook')}
              >
                {showKeys.webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Required for secure webhook event verification
            </p>
          </div>
        </div>

        {/* Helpful Links */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Helpful Links</h4>
          <div className="flex flex-wrap gap-2">
            <a 
              href="https://dashboard.stripe.com/apikeys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              API Keys <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="https://dashboard.stripe.com/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Webhooks <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="https://stripe.com/docs/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Last Tested Info */}
        {settings?.stripe_last_tested_at && (
          <p className="text-xs text-slate-500">
            Last tested: {new Date(settings.stripe_last_tested_at).toLocaleString()}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleTestConnection} 
            disabled={testing || saving || !validateCurrentModeKeys()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="w-4 h-4" />
            {testing ? "Testing..." : `Test ${config.stripe_mode} Connection`}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Saving..." : "Save Stripe Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
