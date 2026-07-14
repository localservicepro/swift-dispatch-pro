
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, Package, MapPin, User, Mail } from "lucide-react";

interface PaymentDetailsCardProps {
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
    due_date: string;
    customer_email: string;
    paid_at?: string;
  };
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_address: string;
    total_amount: number;
    status: string;
    payment_status: string;
    delivery_date?: string;
  } | null;
}

export function PaymentDetailsCard({ invoice, order }: PaymentDetailsCardProps) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-semibold text-lg">{formatCurrency(invoice.amount, invoice.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              {getStatusBadge(invoice.status)}
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="font-semibold">{formatDate(invoice.due_date)}</p>
            </div>
            {invoice.paid_at && (
              <div>
                <p className="text-sm text-gray-600">Paid On</p>
                <p className="font-semibold">{formatDate(invoice.paid_at)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Customer Email
              </p>
              <p className="font-semibold">{invoice.customer_email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      {order && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="font-semibold">{order.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-semibold text-lg">{formatCurrency(order.total_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Customer
                </p>
                <p className="font-semibold">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Status</p>
                {getStatusBadge(order.status)}
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </p>
                <p className="font-semibold">{order.customer_address}</p>
              </div>
              {order.delivery_date && (
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Delivery Date
                  </p>
                  <p className="font-semibold">{formatDate(order.delivery_date)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
