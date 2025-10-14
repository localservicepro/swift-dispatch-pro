import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, AlertTriangle, CheckCircle, XCircle, Send } from 'lucide-react';
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
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.last_portal_login) {
      setLastLogin(new Date(customer.last_portal_login).toLocaleString());
    }
  }, [customer?.last_portal_login]);

  const canEnablePortal = customer?.customer_type === 'account' && primaryContactEmail;
  const portalEnabled = customer?.portal_access_enabled;

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
              {isSendingLink ? "Sending..." : "Send Login Link"}
            </Button>
          )}
        </div>

        {portalEnabled && (
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Primary contact will receive a magic link via email to access the portal. No password needed!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
