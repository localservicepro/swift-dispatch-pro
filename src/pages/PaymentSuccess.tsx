
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Package, Phone } from "lucide-react";
import { PaymentVerificationStatus } from "@/components/PaymentVerificationStatus";
import { PaymentDetailsCard } from "@/components/PaymentDetailsCard";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');
  
  const { invoice, order, loading: detailsLoading, error: detailsError } = usePaymentDetails(invoiceId);

  const handleVerificationComplete = (success: boolean) => {
    setVerificationComplete(true);
    setVerificationSuccess(success);
  };

  const handleDownloadReceipt = () => {
    toast({
      title: "Receipt Download",
      description: "Receipt download feature will be available soon.",
    });
  };

  const handleViewOrderStatus = () => {
    if (order?.id) {
      // Navigate to order tracking page when available
      toast({
        title: "Order Tracking",
        description: "Order tracking feature will be available soon.",
      });
    }
  };

  const handleContactSupport = () => {
    toast({
      title: "Support Contact",
      description: "Please contact support at support@company.com",
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {!verificationComplete ? (
          <div className="flex justify-center">
            <PaymentVerificationStatus
              sessionId={sessionId}
              invoiceId={invoiceId}
              onVerificationComplete={handleVerificationComplete}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Status Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto mb-4">
                <CheckCircle className={`w-16 h-16 ${verificationSuccess ? 'text-green-500' : 'text-blue-500'}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${verificationSuccess ? 'text-green-600' : 'text-blue-600'}`}>
                  {verificationSuccess ? 'Payment Successful!' : 'Payment Received'}
                </h1>
                <p className="text-gray-600 text-lg">
                  {verificationSuccess 
                    ? 'Thank you! Your payment has been processed and your order status has been updated.'
                    : 'Your payment has been received. If verification failed, our team will process it manually and update your order status shortly.'
                  }
                </p>
              </div>
            </div>

            {/* Payment Details */}
            {!detailsLoading && !detailsError && invoice && (
              <PaymentDetailsCard invoice={invoice} order={order} />
            )}

            {detailsError && (
              <div className="text-center text-red-600">
                <p>Unable to load payment details: {detailsError}</p>
              </div>
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
        )}
      </div>
    </div>
  );
}
