import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomerStoreSettingsProps {
  customer: any;
  onStoreUpdate: () => void;
}

export function CustomerStoreSettings({ customer, onStoreUpdate }: CustomerStoreSettingsProps) {
  const { toast } = useToast();
  const [store, setStore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, [customer?.id]);

  const loadStore = async () => {
    if (!customer?.id) return;

    const { data, error } = await supabase
      .from('customer_stores')
      .select('*')
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (!error && data) {
      setStore(data);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!store) return;

    const { error } = await supabase
      .from('customer_stores')
      .update({
        display_name: store.display_name,
        custom_message: store.custom_message,
        contact_email: store.contact_email,
        contact_phone: store.contact_phone,
        is_active: store.is_active,
      })
      .eq('id', store.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Store settings updated successfully',
      });
      onStoreUpdate();
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/${store.slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied',
      description: 'Storefront URL copied to clipboard',
    });
  };

  if (isLoading) {
    return <div>Loading store settings...</div>;
  }

  if (!store) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Store not yet created. Enable portal access to create a storefront.
        </p>
      </div>
    );
  }

  const storefrontUrl = `${window.location.origin}/${store.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <Label>Storefront URL</Label>
        <div className="flex items-center gap-2 mt-2">
          <Input value={storefrontUrl} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={copyUrl}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Share this URL with customers to let them place orders
        </p>
      </div>

      <div>
        <Label htmlFor="display_name">Store Display Name</Label>
        <Input
          id="display_name"
          value={store.display_name}
          onChange={(e) => setStore({ ...store, display_name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="custom_message">Custom Message</Label>
        <Textarea
          id="custom_message"
          value={store.custom_message || ''}
          onChange={(e) => setStore({ ...store, custom_message: e.target.value })}
          placeholder="Welcome message for customers..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input
          id="contact_email"
          type="email"
          value={store.contact_email || ''}
          onChange={(e) => setStore({ ...store, contact_email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="contact_phone">Contact Phone</Label>
        <Input
          id="contact_phone"
          value={store.contact_phone || ''}
          onChange={(e) => setStore({ ...store, contact_phone: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={store.is_active}
          onCheckedChange={(checked) => setStore({ ...store, is_active: checked })}
        />
        <Label htmlFor="is_active">Store Active</Label>
      </div>

      <Button onClick={handleSave}>Save Store Settings</Button>
    </div>
  );
}
