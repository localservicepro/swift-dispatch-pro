import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, AlertTriangle, CheckCircle, XCircle, Send, KeyRound, Copy, RefreshCw, Ban } from 'lucide-react';
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
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.last_portal_login) {
      setLastLogin(new Date(customer.last_portal_login).toLocaleString());
    }
    if (customer?.pin_expires_at) {
      setPinExpiresAt(new Date(customer.pin_expires_at).toLocaleDateString());
    }
  }, [customer?.last_portal_login, customer?.pin_expires_at]);

  const canEnablePortal = customer?.customer_type === 'account' && primaryContactEmail;
  const portalEnabled = customer?.portal_access_enabled;
  const pinEnabled = customer?.pin_enabled;

  const handleTogglePortalAccess = async () => {
    if (!customer || !primaryContactEmail) return;

    if (!canEnablePortal) {
      toast({
        title: "Cannot enable portal",
        description: "Please set a primary contact with an email address first",
        variant: "destructive"
      });
      return;
    }

    setIsEnabling(true);

    try {
      const { data, error } = await supabase.rpc('enable_customer_portal_access', {
        p_customer_id: customer.id,
        p_email: primaryContactEmail,
        p_password: '' // Not used for magic link
      });

      if (error) throw error;

      toast({
        title: portalEnabled ? "Portal access disabled" : "Portal access enabled",
        description: portalEnabled 
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

  const handleGeneratePin = async (regenerate = false) => {
    if (!customer || !primaryContactEmail) return;

    setIsGeneratingPin(true);
    setGeneratedPin(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-portal-pin', {
        body: {
          customer_id: customer.id,
          regenerate
        }
      });

      if (error) throw error;

      setGeneratedPin(data.pin);
      setPinExpiresAt(new Date(data.expires_at).toLocaleDateString());

      toast({
        title: regenerate ? "PIN regenerated" : "PIN generated",
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

  // Only show for account customers
  if (customer?.customer_type !== 'account') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Customer Portal Access
            </CardTitle>
            <CardDescription>
              Allow primary contact to access customer portal via magic link
            </CardDescription>
          </div>
          {portalEnabled ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Disabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!primaryContactEmail && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No primary contact with email address found. Please set a primary contact first.
            </AlertDescription>
          </Alert>
        )}

        {primaryContactEmail && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Primary Contact:</span>
              <span>{primaryContactName || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span className="text-muted-foreground">{primaryContactEmail}</span>
            </div>
            {lastLogin && portalEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Last Login:</span>
                <span className="text-muted-foreground">{lastLogin}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleTogglePortalAccess}
            disabled={!canEnablePortal || isEnabling}
            variant={portalEnabled ? "destructive" : "default"}
          >
            {isEnabling ? "Processing..." : portalEnabled ? "Disable Access" : "Enable Access"}
          </Button>
          
          {portalEnabled && (
            <Button
              onClick={handleSendLoginLink}
              disabled={isSendingLink}
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSendingLink ? "Sending..." : "Send Magic Link"}
            </Button>
          )}
        </div>

        {portalEnabled && (
          <>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Primary contact can use magic link or PIN code to access the portal.
              </AlertDescription>
            </Alert>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold">PIN Code Access</span>
                </div>
                {pinEnabled ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Disabled
                  </Badge>
                )}
              </div>

              {pinEnabled && pinExpiresAt && (
                <div className="text-sm text-muted-foreground">
                  Expires: {pinExpiresAt}
                </div>
              )}

              {generatedPin && (
                <Alert>
                  <KeyRound className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Generated PIN Code:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-2xl font-bold tracking-widest bg-muted px-4 py-2 rounded">
                          {generatedPin}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyPin}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This PIN will only be shown once. Save it securely.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!pinEnabled ? (
                  <Button
                    onClick={() => handleGeneratePin(false)}
                    disabled={isGeneratingPin}
                    variant="outline"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    {isGeneratingPin ? "Generating..." : "Generate PIN"}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleGeneratePin(true)}
                      disabled={isGeneratingPin}
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {isGeneratingPin ? "Regenerating..." : "Regenerate PIN"}
                    </Button>
                    <Button
                      onClick={handleDisablePin}
                      disabled={isGeneratingPin}
                      variant="outline"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Disable PIN
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
