
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Receipt, Bell } from "lucide-react";

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
}

interface PaymentRecordsListProps {
  payments: PaymentOrder[];
  selectedPayments: string[];
  sendingInvoices: string[];
  generatingInvoices: string[];
  isLoading: boolean;
  activeFilterCount: number;
  onToggleSelection: (paymentId: string) => void;
  onGenerateInvoice: (orderId: string) => void;
  onSendInvoice: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onClearFilters: () => void;
}

export function PaymentRecordsList({
  payments,
  selectedPayments,
  sendingInvoices,
  generatingInvoices,
  isLoading,
  activeFilterCount,
  onToggleSelection,
  onGenerateInvoice,
  onSendInvoice,
  onUpdateStatus,
  onClearFilters
}: PaymentRecordsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "invoiced":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            Payment Records 
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Bell className="w-4 h-4 text-green-500" />
            {payments.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {payments.length} records
              </Badge>
            )}
          </CardTitle>
          <Badge className="bg-green-100 text-green-800">
            Real-time Updates Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading payment records...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No payment records match your search criteria.</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={onClearFilters} className="mt-2">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(payment => (
              <div key={payment.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={selectedPayments.includes(payment.id)} 
                      onChange={() => onToggleSelection(payment.id)} 
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <h3 className="font-semibold text-slate-800">{payment.order_number}</h3>
                    <Badge className={getStatusColor(payment.payment_status)}>
                      {payment.payment_status}
                    </Badge>
                  </div>
                  <span className="text-lg font-bold text-green-600">${payment.total_amount.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{payment.customer_name}</p>
                    {payment.customer_phone && <p className="text-xs text-slate-400">{payment.customer_phone}</p>}
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium text-xs">{payment.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment Method</p>
                    <p className="font-medium">{payment.payment_method || 'Not Set'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Order Date</p>
                    <p className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onGenerateInvoice(payment.id)}
                    disabled={generatingInvoices.includes(payment.id)}
                    className="flex items-center gap-2"
                  >
                    {generatingInvoices.includes(payment.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                    {generatingInvoices.includes(payment.id) ? "Generating..." : "Generate Invoice"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onSendInvoice(payment.id)} 
                    disabled={sendingInvoices.includes(payment.id)} 
                    className="flex items-center gap-2"
                  >
                    {sendingInvoices.includes(payment.id) && <Loader2 className="w-4 h-4 animate-spin" />}
                    {sendingInvoices.includes(payment.id) ? "Sending..." : "Send Simple Invoice"}
                  </Button>
                  
                  <Select onValueChange={value => onUpdateStatus(payment.id, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="invoiced">Invoiced</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
