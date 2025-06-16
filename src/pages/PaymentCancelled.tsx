
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw, Phone, CreditCard } from "lucide-react";
import { PaymentDetailsCard } from "@/components/PaymentDetailsCard";
import { usePaymentDetails } from "@/hooks/usePaymentDetails";
import { useToast } from "@/hooks/use-toast";

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const invoiceId = searchParams.get('invoice_id');
  const { invoice, order, loading, error } = usePaymentDetails(invoiceId);

  const handleTryAgain = () => {
    if (invoice?.payment_url) {
      window.open(invoice.payment_url, '_blank');
    } else {
      toast({
        title: "Payment Link Not Available",
        description: "Please contact support to retry payment.",
        variant: "destructive"
      });
    }
  };

  const handleContactSupport = () => {
    toast({
      title: "Support Contact",
      description: "Please contact support at support@localservicepro.com.au for assistance with your payment.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="space-y-6">
          {/* Cancellation Status Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Cancelled</h1>
              <p className="text-gray-600 text-lg">
                Your payment was cancelled. No charges have been made to your account.
              </p>
            </div>
          </div>

          {/* Cancellation Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-600">What happened?</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                You cancelled the payment process before it was completed. This could have happened if:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 text-left max-w-md mx-auto">
                <li>• You clicked the back button or closed the payment window</li>
                <li>• You decided not to complete the purchase</li>
                <li>• There was an issue with your payment method</li>
              </ul>
              
              {invoiceId && (
                <p className="text-sm text-gray-500 pt-2">
                  Invoice ID: {invoiceId}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Details if available */}
          {!loading && !error && invoice && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center">Invoice Details</h2>
              <PaymentDetailsCard invoice={invoice} order={order} />
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="text-center py-6">
                <p className="text-red-600">Unable to load invoice details: {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleTryAgain} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Payment Again
            </Button>
            
            <Button onClick={handleContactSupport} variant="outline" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Support
            </Button>
          </div>

          {/* Recovery Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">What can you do next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <h3 className="font-semibold mb-1">Try Different Payment Method</h3>
                  <p className="text-sm text-gray-600">Use a different card or payment option when you retry</p>
                </div>
                <div className="text-center">
                  <Phone className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-semibold mb-1">Get Help</h3>
                  <p className="text-sm text-gray-600">Contact our support team if you're experiencing issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
