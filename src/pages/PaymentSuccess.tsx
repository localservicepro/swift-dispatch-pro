
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState<string>('');
  
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      updatePaymentStatus();
    }
  }, [orderId]);

  const updatePaymentStatus = async () => {
    try {
      // Update order payment status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          payment_method: 'stripe',
          payment_date: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating payment status:', updateError);
        throw updateError;
      }

      // Get order details for display
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        throw fetchError;
      }

      setOrderNumber(order.order_number);

      toast({
        title: "Payment Successful!",
        description: `Payment for order ${order.order_number} has been processed successfully.`,
      });
    } catch (error: any) {
      console.error('Error processing payment confirmation:', error);
      toast({
        title: "Warning",
        description: "Payment may have been successful, but we couldn't update the status. Please contact support if needed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <p className="text-green-100">Your invoice has been paid successfully</p>
          </CardHeader>
          
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Confirmed</h3>
                <p className="text-green-700">
                  Your payment for order <strong>{orderNumber}</strong> has been processed successfully.
                </p>
                {sessionId && (
                  <p className="text-sm text-green-600 mt-2">
                    Transaction ID: {sessionId}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  You will receive a confirmation email shortly with your payment receipt.
                </p>
                
                <div className="pt-4">
                  <Button asChild className="mr-4">
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
