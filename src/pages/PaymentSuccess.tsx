
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);

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
            className="w-full mt-6"
          >
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
