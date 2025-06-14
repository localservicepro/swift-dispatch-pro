
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

export function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, payment_status, created_at')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      setOrder(data);
      
      // If already paid, redirect to success page
      if (data.payment_status === 'paid') {
        toast({
          title: "Already Paid",
          description: "This invoice has already been paid.",
        });
        navigate('/payment-success');
        return;
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Unable to load invoice details. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!orderId) return;
    
    setProcessingPayment(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error: any) {
      console.error('Error creating payment session:', error);
      toast({
        title: "Payment Error",
        description: "Unable to process payment. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Invoice not found</p>
            <Button onClick={() => navigate('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Pay Invoice</CardTitle>
            <p className="text-blue-100">Secure payment powered by Stripe</p>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Invoice Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Order Number</p>
                    <p className="font-medium">{order.order_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Customer</p>
                    <p className="font-medium">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Invoice Date</p>
                    <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-medium capitalize text-orange-600">{order.payment_status}</p>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="text-center border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <p className="text-gray-600 mb-2">Total Amount Due</p>
                <p className="text-4xl font-bold text-blue-600">${order.total_amount.toFixed(2)}</p>
              </div>

              {/* Payment Button */}
              <div className="text-center space-y-4">
                <Button
                  onClick={handlePayment}
                  disabled={processingPayment}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 text-lg"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Pay ${order.total_amount.toFixed(2)} Now
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-gray-500">
                  Secure payment processing by Stripe • Your payment information is encrypted and secure
                </p>
              </div>

              {/* Security Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Secure Payment</h4>
                    <p className="text-sm text-green-700">Your payment is processed securely through Stripe. We do not store your payment information.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
