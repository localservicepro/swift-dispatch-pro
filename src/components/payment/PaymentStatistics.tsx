
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentOrder {
  id: string;
  total_amount: number;
  payment_status: string;
}

interface PaymentStatisticsProps {
  payments: PaymentOrder[];
}

export function PaymentStatistics({ payments }: PaymentStatisticsProps) {
  const totalReceived = payments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + p.total_amount, 0);
  const pendingPayments = payments.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + p.total_amount, 0);
  const invoicedPayments = payments.filter(p => p.payment_status === 'invoiced').reduce((sum, p) => sum + p.total_amount, 0);
  const overduePayments = payments.filter(p => p.payment_status === 'overdue').reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Total Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">${totalReceived.toFixed(2)}</div>
          <p className="text-xs text-green-600 mt-1">From paid orders</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Invoiced</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">${invoicedPayments.toFixed(2)}</div>
          <p className="text-xs text-blue-600 mt-1">Invoices sent</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-yellow-700">Pending Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-900">${pendingPayments.toFixed(2)}</div>
          <p className="text-xs text-yellow-600 mt-1">Awaiting invoice</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-900">${overduePayments.toFixed(2)}</div>
          <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
        </CardContent>
      </Card>
    </div>
  );
}
