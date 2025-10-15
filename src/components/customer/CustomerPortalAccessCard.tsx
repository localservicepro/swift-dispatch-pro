import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, AlertCircle, Check, Copy, Key, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerPortalAccessCardProps {
  customer: Customer | null;
  primaryContactEmail: string | null;
  primaryContactName: string | null;
  onAccessChange?: () => void;
}

export function CustomerPortalAccessCard({ 
  customer, 
  primaryContactEmail,
  primaryContactName,
  onAccessChange 
}: CustomerPortalAccessCardProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.pin_expires_at) {
      setPinExpiresAt(customer.pin_expires_at);
    }
  }, [customer?.pin_expires_at]);

  // Only show for account customers
  if (customer?.customer_type !== 'account') {
    return null;
  }

  const handleTogglePortalAccess = async () => {
    if (!customer || !primaryContactEmail) return;

    setIsEnabling(true);

    try {
      const { data, error } = await supabase.rpc('enable_customer_portal_access', {
        p_customer_id: customer.id,
        p_email: primaryContactEmail,
        p_password: '' // Not used for magic link
      });

      if (error) throw error;

      toast({
        title: customer.portal_access_enabled ? "Portal access disabled" : "Portal access enabled",
        description: customer.portal_access_enabled 
          ? "Customer portal access has been disabled" 
          : "Welcome email sent to primary contact",
      });

      onAccessChange?.();
    } catch (error: any) {
      console.error('Error toggling portal access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update portal access",
        variant: "destructive"
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSendLoginLink = async () => {
    if (!customer || !primaryContactEmail) return;

    setIsSendingLink(true);

    try {
      const { error } = await supabase.functions.invoke('send-portal-magic-link', {
        body: {
          customerId: customer.id,
          email: primaryContactEmail,
          contactName: primaryContactName
        }
      });

      if (error) throw error;

      toast({
        title: "Login link sent",
        description: `Magic link sent to ${primaryContactEmail}`,
      });
    } catch (error: any) {
      console.error('Error sending login link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send login link",
        variant: "destructive"
      });
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleGeneratePin = async () => {
    if (!customer || !primaryContactEmail) return;

    setIsGeneratingPin(true);
    setGeneratedPin(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-portal-pin', {
        body: {
          customer_id: customer.id,
          regenerate: customer.pin_enabled || false
        }
      });

      if (error) throw error;

      setGeneratedPin(data.pin);
      setPinExpiresAt(data.expires_at);

      toast({
        title: customer.pin_enabled ? "PIN regenerated" : "PIN generated",
        description: `New PIN has been sent to ${primaryContactEmail}`,
      });

      onAccessChange?.();
    } catch (error: any) {
      console.error('Error generating PIN:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PIN",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const handleCopyPin = () => {
    if (generatedPin) {
      navigator.clipboard.writeText(generatedPin);
      toast({
        title: "PIN copied",
        description: "PIN code copied to clipboard",
      });
    }
  };

  const handleDisablePin = async () => {
    if (!customer) return;

    setIsGeneratingPin(true);

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          pin_enabled: false,
          portal_access_pin: null,
          pin_failed_attempts: 0,
          pin_locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) throw error;

      setGeneratedPin(null);
      toast({
        title: "PIN disabled",
        description: "PIN code authentication has been disabled",
      });

      onAccessChange?.();
    } catch (error: any) {
      console.error('Error disabling PIN:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disable PIN",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPin(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Customer Portal Setup</CardTitle>
        <CardDescription>
          Configure portal access and authentication for this account customer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Contact Info */}
        {primaryContactEmail ? (
          <div className="space-y-2">
            <Label>Primary Contact</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{primaryContactName || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{primaryContactEmail}</p>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No primary contact set. Please set a primary contact in the Contacts tab before setting up portal access.
            </AlertDescription>
          </Alert>
        )}

        {primaryContactEmail && (
          <>
            {/* Step 1: Generate PIN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <Label className="text-base font-semibold">Generate PIN Code</Label>
              </div>
              
              <div className="ml-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create a secure 6-digit PIN that the customer will use to login to their portal.
                </p>

                {customer.pin_enabled && !generatedPin && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                      <Check className="mr-1 h-3 w-3" />
                      PIN Active
                    </Badge>
                    {pinExpiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expires: {format(new Date(pinExpiresAt), "PPp")}
                      </span>
                    )}
                  </div>
                )}

                {generatedPin && (
                  <Alert className="bg-primary/5 border-primary/20">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">PIN Code Generated</p>
                        <div className="flex items-center gap-2 p-2 bg-background rounded border">
                          <code className="flex-1 text-lg font-mono tracking-wider">
                            {generatedPin}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyPin}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Copy this PIN to share with the customer. It was also sent via email.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGeneratePin}
                    disabled={isGeneratingPin}
                    variant="outline"
                    size="sm"
                  >
                    {isGeneratingPin ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-3 w-3" />
                        {customer.pin_enabled ? "Regenerate PIN" : "Generate New PIN"}
                      </>
                    )}
                  </Button>
                  
                  {customer.pin_enabled && (
                    <Button
                      onClick={handleDisablePin}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Disable PIN
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 2: Enable Portal Access */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <Label className="text-base font-semibold">Enable Portal Access</Label>
              </div>
              
              <div className="ml-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {customer.portal_access_enabled 
                    ? "Portal access is currently enabled for this customer."
                    : "Activate the customer portal to allow login access."}
                </p>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Portal Status</span>
                      <Badge variant={customer.portal_access_enabled ? "default" : "secondary"}>
                        {customer.portal_access_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    {customer.last_portal_login && (
                      <p className="text-sm text-muted-foreground">
                        Last login: {format(new Date(customer.last_portal_login), "PPp")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleTogglePortalAccess}
                    disabled={isEnabling}
                    variant={customer.portal_access_enabled ? "destructive" : "default"}
                  >
                    {isEnabling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : customer.portal_access_enabled ? (
                      "Disable Access"
                    ) : (
                      "Enable Access"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {customer.portal_access_enabled && (
              <>
                <Separator />

                {/* Step 3: Share Credentials */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      3
                    </div>
                    <Label className="text-base font-semibold">Share Login Credentials</Label>
                  </div>
                  
                  <div className="ml-8 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Send login credentials to the customer via email or copy the PIN to share manually.
                    </p>

                    {/* Magic Link Option */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Send Magic Link</p>
                        <p className="text-xs text-muted-foreground">
                          Email a secure one-time login link to {primaryContactEmail}
                        </p>
                      </div>
                      <Button
                        onClick={handleSendLoginLink}
                        disabled={isSendingLink}
                        variant="outline"
                        size="sm"
                      >
                        {isSendingLink ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-3 w-3" />
                            Send Link
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Copy PIN Option */}
                    {customer.pin_enabled && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <p className="font-medium text-sm">Share PIN Code</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Customer can login at the portal using their 6-digit PIN
                        </p>
                        <Button
                          onClick={handleGeneratePin}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Key className="mr-2 h-3 w-3" />
                          View & Copy PIN
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}