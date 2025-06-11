
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  orderId: string;
  customer: string;
  amount: number;
  status: string;
  method: string;
  date: string;
}

const mockPayments: Payment[] = [
  { id: "PAY-001", orderId: "ORD-001", customer: "John Doe", amount: 25.50, status: "Paid", method: "Credit Card", date: "2024-01-15" },
  { id: "PAY-002", orderId: "ORD-002", customer: "Jane Smith", amount: 18.75, status: "Pending", method: "Bank Transfer", date: "2024-01-15" },
  { id: "PAY-003", orderId: "ORD-003", customer: "Bob Brown", amount: 22.00, status: "Overdue", method: "Cash", date: "2024-01-10" },
];

export function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const { toast } = useToast();

  const sendInvoice = (paymentId: string) => {
    toast({
      title: "Invoice Sent",
      description: `Invoice for ${paymentId} has been sent to the customer`,
    });
  };

  const sendBatchInvoices = () => {
    if (selectedPayments.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select payments to send batch invoices",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Batch Invoices Sent",
      description: `${selectedPayments.length} invoices have been sent`,
    });
    setSelectedPayments([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Payment Management</h2>
          <p className="text-slate-600 mt-1">Track payments and manage invoicing</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={sendBatchInvoices}
            variant="outline"
            disabled={selectedPayments.length === 0}
          >
            Send Batch Invoices ({selectedPayments.length})
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
            Month-End Billing
          </Button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">$2,456.50</div>
            <p className="text-xs text-green-600 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">$892.25</div>
            <p className="text-xs text-yellow-600 mt-1">Awaiting collection</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">$156.00</div>
            <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Quick Payment Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer-search">Link Payment to Customer</Label>
              <div className="flex gap-2">
                <Input 
                  id="customer-search"
                  placeholder="Search customer..."
                />
                <Button size="sm" variant="outline">Link</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="order-search">Link Payment to Order</Label>
              <div className="flex gap-2">
                <Input 
                  id="order-search"
                  placeholder="Enter order ID..."
                />
                <Button size="sm" variant="outline">Link</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="payment-status">Update Payment Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Mark as Paid</SelectItem>
                  <SelectItem value="pending">Mark as Pending</SelectItem>
                  <SelectItem value="overdue">Mark as Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPayments.includes(payment.id)}
                      onChange={() => togglePaymentSelection(payment.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <h3 className="font-semibold text-slate-800">{payment.id}</h3>
                    <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                  </div>
                  <span className="text-lg font-bold text-green-600">${payment.amount.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{payment.customer}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Order ID</p>
                    <p className="font-medium">{payment.orderId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment Method</p>
                    <p className="font-medium">{payment.method}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Date</p>
                    <p className="font-medium">{payment.date}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => sendInvoice(payment.id)}
                  >
                    Send Invoice
                  </Button>
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="outline">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
