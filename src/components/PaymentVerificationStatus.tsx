
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";

interface PaymentVerificationStatusProps {
  sessionId: string;
  invoiceId: string;
  onVerificationComplete: (success: boolean) => void;
}

export function PaymentVerificationStatus({ 
  sessionId, 
  invoiceId, 
  onVerificationComplete 
}: PaymentVerificationStatusProps) {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed' | 'retrying'>('pending');
  const [retryCount, setRetryCount] = useState(0);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const { toast } = useToast();

  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  const verifyPayment = async (attempt = 1) => {
    try {
      console.log(`Payment verification attempt ${attempt}/${maxRetries + 1}`);
      
      if (attempt > 1) {
        setVerificationStatus('retrying');
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }

      const { data, error } = await supabase.functions.invoke('verify-invoice-payment', {
        body: { sessionId, invoiceId }
      });

      if (error) {
        console.error('Payment verification error:', error);
        throw error;
      }

      if (data.success) {
        setVerificationStatus('success');
        setVerificationDetails(data);
        onVerificationComplete(true);
        
        toast({
          title: "Payment Verified",
          description: "Your payment has been successfully processed and your order status updated!"
        });
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error(`Payment verification attempt ${attempt} failed:`, error);
      
      if (attempt <= maxRetries) {
        setRetryCount(attempt);
        setTimeout(() => verifyPayment(attempt + 1), retryDelay * attempt);
      } else {
        setVerificationStatus('failed');
        onVerificationComplete(false);
        
        toast({
          title: "Payment Verification Failed",
          description: "Unable to verify payment after multiple attempts. Please contact support.",
          variant: "destructive"
        });
      }
    }
  };

  const manualRetry = () => {
    setRetryCount(0);
    setVerificationStatus('pending');
    verifyPayment(1);
  };

  useEffect(() => {
    verifyPayment(1);
  }, [sessionId, invoiceId]);

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'retrying':
        return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Payment Verified Successfully';
      case 'failed':
        return 'Payment Verification Failed';
      case 'retrying':
        return `Retrying Verification (Attempt ${retryCount + 1}/${maxRetries + 1})`;
      default:
        return 'Verifying Payment...';
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'retrying':
        return <Badge className="bg-blue-100 text-blue-800">Retrying</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          {getStatusIcon()}
        </div>
        <CardTitle className="text-xl">
          {getStatusText()}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {getStatusBadge()}
        
        {verificationStatus === 'retrying' && (
          <div className="text-sm text-gray-600">
            <p>Please wait while we verify your payment...</p>
            <p className="text-xs mt-1">Attempt {retryCount + 1} of {maxRetries + 1}</p>
          </div>
        )}

        {verificationStatus === 'failed' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              We couldn't verify your payment automatically. This doesn't mean your payment failed.
            </p>
            <Button onClick={manualRetry} className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {verificationDetails && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>Session ID: {sessionId}</p>
            <p>Invoice ID: {invoiceId}</p>
            {verificationDetails.orderId && (
              <p>Order ID: {verificationDetails.orderId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
