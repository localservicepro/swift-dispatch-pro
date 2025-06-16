
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";
import { PaymentVerificationStatus } from "@/components/PaymentVerificationStatus";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');

  const handleVerificationComplete = (success: boolean) => {
    setVerificationComplete(true);
    setVerificationSuccess(success);
  };

  if (!sessionId || !invoiceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Invalid Payment Information</h2>
          <p className="text-gray-600 mb-4">Missing payment session or invoice information</p>
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        {!verificationComplete ? (
          <PaymentVerificationStatus
            sessionId={sessionId}
            invoiceId={invoiceId}
            onVerificationComplete={handleVerificationComplete}
          />
        ) : (
          <div className="text-center space-y-6">
            {verificationSuccess ? (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
                  <p className="text-gray-600 mb-4">
                    Thank you! Your payment has been processed and your order status has been updated.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="w-16 h-16 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">Payment Received</h2>
                  <p className="text-gray-600 mb-4">
                    Your payment has been received. If verification failed, our team will process it manually and update your order status shortly.
                  </p>
                </div>
              </>
            )}
            
            <Button onClick={() => navigate('/')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
