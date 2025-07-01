
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {settings ? "Update Settings" : "Save Settings"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
