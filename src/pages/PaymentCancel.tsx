
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-white" />
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <p className="text-red-100">Your payment was not completed</p>
          </CardHeader>
          
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Payment Not Processed</h3>
                <p className="text-yellow-700">
                  Your payment was cancelled and no charges were made to your account.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  If you cancelled by mistake, you can try paying again. Your invoice is still pending payment.
                </p>
                
                <div className="pt-4 space-x-4">
                  {orderId && (
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                      <Link to={`/pay-invoice/${orderId}`}>Try Payment Again</Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link to="/">Return to Dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
