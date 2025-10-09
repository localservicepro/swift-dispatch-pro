import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PortalSettings() {
  const { customer, storeEnabled, storeSlug } = useCustomerAuth();
  const { toast } = useToast();

  const storefrontUrl = storeSlug ? `${window.location.origin}/${storeSlug}` : '';

  const copyStorefrontUrl = () => {
    navigator.clipboard.writeText(storefrontUrl);
    toast({
      title: 'Copied',
      description: 'Storefront URL copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive order status updates via SMS
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={customer?.sms_notifications_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {storeEnabled && storeSlug && (
        <Card>
          <CardHeader>
            <CardTitle>Your Storefront</CardTitle>
            <CardDescription>
              Share this URL with your customers to let them place orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                {storefrontUrl}
              </div>
              <Button variant="outline" size="icon" onClick={copyStorefrontUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
