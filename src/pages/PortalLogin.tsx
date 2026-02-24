import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PinCodeInput } from '@/components/customer/PinCodeInput';
import { useNavigate } from 'react-router-dom';

export default function PortalLogin() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pinError, setPinError] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(false);
    
    if (!pin) {
      toast({
        title: "PIN required",
        description: "Please enter your 6-digit PIN code",
        variant: "destructive"
      });
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 6 digits",
        variant: "destructive"
      });
      setPinError(true);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-portal-pin', {
        body: { pin }
      });

      if (error) throw error;

      if (data.success) {
        if (data.session?.hashed_token) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.session.hashed_token,
            type: 'email',
          });

          if (verifyError) {
            console.error('Error verifying OTP:', verifyError);
            toast({
              title: "Session error",
              description: "Could not establish login session. Please try again.",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "Login successful!",
            description: `Welcome back, ${data.customer_name}`,
          });
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              navigate('/customer-portal', { replace: true });
              subscription.unsubscribe();
            }
          });

          setTimeout(() => {
            navigate('/customer-portal', { replace: true });
          }, 1000);
        } else {
          toast({
            title: "Account setup required",
            description: "Your account needs to be set up for portal access. Please contact support.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Error verifying PIN:', error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid PIN code",
        variant: "destructive"
      });
      setPinError(true);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl">Customer Portal Access</CardTitle>
            <CardDescription>
              Enter your 6-digit PIN to access your customer portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinLogin} className="space-y-6">
            <div className="space-y-2">
              <PinCodeInput
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setPinError(false);
                }}
                disabled={isLoading}
                error={pinError}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the PIN code provided by your account manager
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || pin.length !== 6}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Login with PIN
                </>
              )}
            </Button>

            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>
                Quick access for account customers. Enter your 6-digit PIN to login instantly.
              </AlertDescription>
            </Alert>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Need help?</p>
            <p className="mt-1">
              Contact your account manager or email{' '}
              <a href="mailto:support@company.com" className="text-primary hover:underline">
                support@company.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
