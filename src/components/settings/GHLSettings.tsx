
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ghlService } from "@/utils/ghlService";
import { Settings, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export function GHLSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await ghlService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading GHL settings:', error);
      toast({
        title: "Error",
        description: "Failed to load GoHighLevel settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings?.api_key || !settings?.location_id) {
      toast({
        title: "Missing Information",
        description: "Please enter both API key and location ID before testing",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await ghlService.testConnection(settings.api_key, settings.location_id);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to ${result.location_name}`,
        });
        await loadSettings(); // Refresh to get updated connection status
      } else {
        toast({
          title: "Connection Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await ghlService.updateSettings({
        ...settings,
        updated_at: new Date().toISOString()
      });
      
      toast({
        title: "Settings Saved",
        description: "GoHighLevel settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getConnectionBadge = () => {
    if (!settings) return null;
    
    switch (settings.connection_status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading GoHighLevel settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          GoHighLevel Integration
          {getConnectionBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* API Configuration */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-700">API Configuration</h3>
          
          <div>
            <Label htmlFor="ghl-api-key">API Key</Label>
            <Input
              id="ghl-api-key"
              type="password"
              value={settings?.api_key || ''}
              onChange={(e) => setSettings({...settings, api_key: e.target.value})}
              placeholder="Enter your GoHighLevel API key"
            />
          </div>

          <div>
            <Label htmlFor="ghl-location-id">Location ID</Label>
            <Input
              id="ghl-location-id"
              value={settings?.location_id || ''}
              onChange={(e) => setSettings({...settings, location_id: e.target.value})}
              placeholder="Enter your GoHighLevel location ID"
            />
          </div>

          <div>
            <Label htmlFor="ghl-pipeline-id">Pipeline ID (Optional)</Label>
            <Input
              id="ghl-pipeline-id"
              value={settings?.ghl_pipeline_id || ''}
              onChange={(e) => setSettings({...settings, ghl_pipeline_id: e.target.value})}
              placeholder="Enter pipeline ID for opportunities"
            />
          </div>

          <Button 
            onClick={handleTestConnection}
            disabled={isTesting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Test Connection
          </Button>
        </div>

        {/* Sync Preferences */}
        <div className="space-y-4">
          <h3 className="font-medium text-slate-700">Sync Preferences</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-sync-customers">Auto-sync Customers</Label>
              <p className="text-sm text-slate-500">Automatically sync customers to GHL when created/updated</p>
            </div>
            <Switch
              id="auto-sync-customers"
              checked={settings?.auto_sync_customers || false}
              onCheckedChange={(checked) => setSettings({...settings, auto_sync_customers: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-sync-orders">Auto-sync Orders</Label>
              <p className="text-sm text-slate-500">Automatically sync orders to GHL as opportunities</p>
            </div>
            <Switch
              id="auto-sync-orders"
              checked={settings?.auto_sync_orders || false}
              onCheckedChange={(checked) => setSettings({...settings, auto_sync_orders: checked})}
            />
          </div>
        </div>

        {/* Connection Info */}
        {settings?.last_tested_at && (
          <div className="text-sm text-slate-500">
            Last tested: {new Date(settings.last_tested_at).toLocaleString()}
          </div>
        )}

        <Button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isSaving ? 'Saving...' : 'Save GoHighLevel Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
