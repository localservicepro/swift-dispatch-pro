
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, AlertCircle } from "lucide-react";

interface WooCommerceSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings?: any;
  onSuccess: () => void;
}

export function WooCommerceSyncDialog({ 
  open, 
  onOpenChange, 
  settings,
  onSuccess 
}: WooCommerceSyncDialogProps) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    store_url: settings?.store_url || "",
    consumer_key: settings?.consumer_key || "",
    consumer_secret: settings?.consumer_secret || "",
    sync_direction: settings?.sync_direction || "wc_to_local",
    auto_sync_enabled: settings?.auto_sync_enabled || false,
    sync_frequency: settings?.sync_frequency || "manual",
    sync_categories: settings?.sync_categories ?? true,
    sync_images: settings?.sync_images ?? true,
    sync_inventory: settings?.sync_inventory ?? true,
    sync_pricing: settings?.sync_pricing ?? true,
    sync_orders: settings?.sync_orders ?? false,
    sync_customers: settings?.sync_customers ?? true,
    order_sync_direction: settings?.order_sync_direction || "wc_to_local",
    order_date_filter: settings?.order_date_filter || "all",
    order_date_from: settings?.order_date_from || "",
    order_date_to: settings?.order_date_to || "",
  });

  const handleTestConnection = async () => {
    if (!formData.store_url || !formData.consumer_key || !formData.consumer_secret) {
      toast({
        title: "Error",
        description: "Please fill in Store URL, Consumer Key, and Consumer Secret first",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setConnectionStatus(null);

    try {
      // First save the settings if they don't exist
      let settingsId = settings?.id;
      if (!settingsId) {
        const { data: newSettings, error } = await supabase
          .from('woocommerce_sync_settings')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        settingsId = newSettings.id;
      }

      const { data, error } = await supabase.functions.invoke('wc-sync', {
        body: {
          action: 'test-connection',
          settingsId: settingsId
        }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        toast({
          title: "Success",
          description: "WooCommerce connection test successful!",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: data.message || "Failed to connect to WooCommerce",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check authentication
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save WooCommerce settings",
        variant: "destructive",
      });
      return;
    }

    // Check admin role
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can manage WooCommerce settings",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('woocommerce_sync_settings')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('woocommerce_sync_settings')
          .insert(formData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "WooCommerce sync settings saved successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save settings error:', error);
      
      // Check for specific authentication errors
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        toast({
          title: "Authentication Error",
          description: "Please log in as an administrator to save WooCommerce settings",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save settings",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show authentication required message
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Please log in to continue</p>
                <p className="text-sm text-yellow-600">You need to be logged in as an administrator to configure WooCommerce sync settings.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Administrator access required</p>
                <p className="text-sm text-red-600">Only administrators can manage WooCommerce sync settings.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {settings ? "Edit WooCommerce Settings" : "Configure WooCommerce Sync"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_url">Store URL</Label>
              <Input
                id="store_url"
                placeholder="https://yourstore.com"
                value={formData.store_url}
                onChange={(e) => setFormData({ ...formData, store_url: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync_direction">Sync Direction</Label>
              <Select
                value={formData.sync_direction}
                onValueChange={(value) => setFormData({ ...formData, sync_direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wc_to_local">WooCommerce → Local</SelectItem>
                  <SelectItem value="local_to_wc">Local → WooCommerce</SelectItem>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="consumer_key">Consumer Key</Label>
              <Input
                id="consumer_key"
                type="password"
                value={formData.consumer_key}
                onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumer_secret">Consumer Secret</Label>
              <Input
                id="consumer_secret"
                type="password"
                value={formData.consumer_secret}
                onChange={(e) => setFormData({ ...formData, consumer_secret: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Sync Options</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync_categories">Sync Categories</Label>
                <Switch
                  id="sync_categories"
                  checked={formData.sync_categories}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_categories: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sync_images">Sync Images</Label>
                <Switch
                  id="sync_images"
                  checked={formData.sync_images}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_images: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sync_inventory">Sync Inventory</Label>
                <Switch
                  id="sync_inventory"
                  checked={formData.sync_inventory}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_inventory: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sync_pricing">Sync Pricing</Label>
                <Switch
                  id="sync_pricing"
                  checked={formData.sync_pricing}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_pricing: checked })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Order & Customer Sync</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync_orders">Sync Orders</Label>
                <Switch
                  id="sync_orders"
                  checked={formData.sync_orders}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_orders: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sync_customers">Sync Customers</Label>
                <Switch
                  id="sync_customers"
                  checked={formData.sync_customers}
                  onCheckedChange={(checked) => setFormData({ ...formData, sync_customers: checked })}
                />
              </div>
            </div>

            {formData.sync_orders && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="order_sync_direction">Order Sync Direction</Label>
                  <Select
                    value={formData.order_sync_direction}
                    onValueChange={(value) => setFormData({ ...formData, order_sync_direction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wc_to_local">WooCommerce → Local</SelectItem>
                      <SelectItem value="local_to_wc">Local → WooCommerce</SelectItem>
                      <SelectItem value="bidirectional">Bidirectional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_date_filter">Date Filter</Label>
                  <Select
                    value={formData.order_date_filter}
                    onValueChange={(value) => setFormData({ ...formData, order_date_filter: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="recent">Recent Orders (Last 30 days)</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.order_date_filter === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order_date_from">From Date</Label>
                      <Input
                        id="order_date_from"
                        type="date"
                        value={formData.order_date_from}
                        onChange={(e) => setFormData({ ...formData, order_date_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order_date_to">To Date</Label>
                      <Input
                        id="order_date_to"
                        type="date"
                        value={formData.order_date_to}
                        onChange={(e) => setFormData({ ...formData, order_date_to: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Automation</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto_sync_enabled">Enable Auto Sync</Label>
              <Switch
                id="auto_sync_enabled"
                checked={formData.auto_sync_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_sync_enabled: checked })}
              />
            </div>

            {formData.auto_sync_enabled && (
              <div className="space-y-2">
                <Label htmlFor="sync_frequency">Sync Frequency</Label>
                <Select
                  value={formData.sync_frequency}
                  onValueChange={(value) => setFormData({ ...formData, sync_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Only</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testing || loading}
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test Connection
            </Button>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {settings ? "Update Settings" : "Save Settings"}
              </Button>
            </div>
          </div>

          {connectionStatus && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              connectionStatus === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {connectionStatus === 'success' 
                ? '✓ Connection successful! Your WooCommerce store is accessible.'
                : '✗ Connection failed. Please check your credentials and store URL.'
              }
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
