import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, CheckCircle, Building2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PinCodeInput } from '@/components/customer/PinCodeInput';
import { useNavigate } from 'react-router-dom';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pinError, setPinError] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/customer-portal`,
        }
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the login link",
      });
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        toast({
          title: "Login successful!",
          description: `Welcome back, ${data.customer_name}`,
        });
        
        // Store customer info for portal access
        localStorage.setItem('portal_customer_id', data.customer_id);
        localStorage.setItem('portal_customer_name', data.customer_name);
        
        // Redirect to customer portal
        navigate('/customer-portal');
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
              Enter your email to receive a magic link for instant login
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="magic-link">
                <Mail className="w-4 h-4 mr-2" />
                Magic Link
              </TabsTrigger>
              <TabsTrigger value="pin">
                <KeyRound className="w-4 h-4 mr-2" />
                PIN Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link">
              {!emailSent ? (
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Magic Link
                      </>
                    )}
                  </Button>

                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      No password needed! Just enter your email and we'll send you a secure login link.
                    </AlertDescription>
                  </Alert>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Check your email!</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a magic link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click the link in your email to access your customer portal.
                    </p>
                  </div>
                  
                  <Alert>
                    <AlertDescription className="text-left space-y-2">
                      <p className="font-medium">What to do next:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Check your email inbox for the login link</li>
                        <li>Click the link to access your portal instantly</li>
                        <li>The link expires in 1 hour for security</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                  >
                    Send to different email
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pin">
              <form onSubmit={handlePinLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pin-input">Enter Your 6-Digit PIN</Label>
                  <PinCodeInput
                    value={pin}
                    onChange={(value) => {
                      setPin(value);
                      setPinError(false);
                    }}
                    disabled={isLoading}
                    error={pinError}
                  />
                  <p className="text-xs text-muted-foreground">
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
            </TabsContent>
          </Tabs>

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
