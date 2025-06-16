import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { autoSignIn } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [isAutoLoginLoading, setIsAutoLoginLoading] = useState(false);

  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !invoiceId) {
        console.error('Missing payment information:', { sessionId, invoiceId });
        toast({
          title: "Error",
          description: "Missing payment information",
          variant: "destructive"
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log('Starting payment verification...', { sessionId, invoiceId });
        
        const { data, error } = await supabase.functions.invoke('verify-invoice-payment', {
          body: {
            sessionId,
            invoiceId
          }
        });

        console.log('Payment verification response:', { data, error });

        if (error) {
          console.error('Payment verification error:', error);
          throw error;
        }

        if (data.success) {
          setPaymentVerified(true);
          setVerificationDetails(data);
          console.log('Payment verified successfully:', data);
          toast({
            title: "Payment Successful",
            description: "Your invoice has been paid and order status updated!"
          });
        } else {
          console.warn('Payment verification failed:', data);
          throw new Error(data.message || 'Payment verification failed');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast({
          title: "Payment Verification Failed",
          description: error.message || "Unable to verify payment status",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, invoiceId, toast]);

  const handleAutoLogin = async () => {
    if (!verificationDetails?.orderId) {
      toast({
        title: "Error",
        description: "Order information not available for auto-login",
        variant: "destructive"
      });
      return;
    }

    setIsAutoLoginLoading(true);

    try {
      // First, get the customer email from the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('customer_email')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoiceData?.customer_email) {
        throw new Error('Unable to retrieve customer email');
      }

      const { error, isNewAccount } = await autoSignIn(
        invoiceData.customer_email, 
        verificationDetails.orderId
      );

      if (error) {
        console.error('Auto-login failed:', error);
        toast({
          title: "Login Failed",
          description: "Unable to create automatic login. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: isNewAccount ? "Account Created!" : "Welcome Back!",
        description: isNewAccount 
          ? "Your account has been created and you're now logged in. You can view your orders in the customer portal."
          : "You're now logged in to view your orders.",
      });

      // Redirect to customer portal
      navigate('/customer');
    } catch (error: any) {
      console.error('Auto-login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Unable to create automatic login",
        variant: "destructive"
      });
    } finally {
      setIsAutoLoginLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment and update your order status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {paymentVerified ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <AlertCircle className="w-16 h-16 text-orange-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {paymentVerified ? (
              <span className="text-green-600">Payment Successful!</span>
            ) : (
              <span className="text-orange-600">Payment Status</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {paymentVerified ? (
            <>
              <p className="text-gray-600">
                Thank you! Your invoice has been paid successfully and your order status has been updated. You will receive a confirmation email shortly.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Session ID: {sessionId}</p>
                <p className="text-sm text-gray-500">Invoice ID: {invoiceId}</p>
                {verificationDetails?.orderId && (
                  <p className="text-sm text-gray-500">Order ID: {verificationDetails.orderId}</p>
                )}
              </div>
              
              {verificationDetails?.orderId && (
                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={handleAutoLogin}
                    disabled={isAutoLoginLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isAutoLoginLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Check Your Orders
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    This will create an account for you and log you in automatically
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-600">
                There was an issue verifying your payment. Please contact support if you believe this is an error.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Session ID: {sessionId}</p>
                <p className="text-sm text-gray-500">Invoice ID: {invoiceId}</p>
              </div>
            </>
          )}
          
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            className="w-full mt-6"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
