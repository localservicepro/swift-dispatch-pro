import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Package, Phone, Clock, AlertCircle } from "lucide-react";
import { PaymentDetailsCard } from "@/components/PaymentDetailsCard";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');
  
  const { invoice, order, loading: detailsLoading, error: detailsError } = usePaymentDetails(invoiceId);

  // Background verification - doesn't block UI
  useEffect(() => {
    if (!sessionId || !invoiceId) return;

    const runVerification = async () => {
      try {
        console.log('Starting payment verification...', { sessionId, invoiceId });
        
        const { data, error } = await supabase.functions.invoke('verify-invoice-payment', {
          body: { 
            sessionId, 
            invoiceId 
          }
        });

        console.log('Verification response:', { data, error });
        
        if (error) {
          console.error('Verification error:', error);
          setVerificationStatus('failed');
        } else if (data?.success) {
          console.log('Payment verified successfully');
          setVerificationStatus('success');
        } else {
          console.log('Payment verification failed:', data);
          setVerificationStatus('failed');
        }
      } catch (error) {
        console.error('Background verification failed:', error);
        setVerificationStatus('failed');
      }
    };

    runVerification();
  }, [sessionId, invoiceId]);

  const handleDownloadReceipt = () => {
    toast({
      title: "Receipt Download",
      description: "Receipt download feature will be available soon.",
    });
  };

  const handleViewOrderStatus = () => {
    if (order?.id) {
      toast({
        title: "Order Tracking",
        description: "Order tracking feature will be available soon.",
      });
    }
  };

  const handleContactSupport = () => {
    toast({
      title: "Support Contact",
      description: "Please contact support at support@localservicepro.com.au",
    });
  };

  if (!sessionId || !invoiceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Invalid Payment Information</h2>
          <p className="text-gray-600">Missing payment session or invoice information</p>
        </div>
      </div>
    );
  }

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">Verification Failed</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Verifying...</Badge>;
    }
  };

  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Immediate Payment Success Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 text-lg">
              Thank you! Your payment has been received and is being processed.
            </p>
          </div>
        </div>

        {/* Background Verification Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getVerificationIcon()}
              Payment Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {verificationStatus === 'pending' && "We're verifying your payment with our system..."}
                  {verificationStatus === 'success' && "Your payment has been verified and your order status updated."}
                  {verificationStatus === 'failed' && "Automatic verification failed, but your payment was successful. Our team will process it manually."}
                </p>
                {sessionId && (
                  <p className="text-xs text-gray-400 mt-1">Session: {sessionId.slice(-8)}</p>
                )}
              </div>
              {getVerificationBadge()}
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        {!detailsLoading && !detailsError && invoice && (
          <PaymentDetailsCard invoice={invoice} order={order} />
        )}

        {detailsError && (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-amber-600">
                Unable to load payment details at the moment. Your payment was successful.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Details will be available shortly or contact support for assistance.
              </p>
            </CardContent>
          </Card>
        )}

        {detailsLoading && (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-gray-600">Loading payment details...</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleDownloadReceipt} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>
          
          {order && (
            <Button onClick={handleViewOrderStatus} variant="outline" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              View Order Status
            </Button>
          )}
          
          <Button onClick={handleContactSupport} variant="outline" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
