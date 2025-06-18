
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bell } from "lucide-react";
import { PaymentRecordCard } from "./PaymentRecordCard";

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

interface PaymentRecordsListProps {
  payments: PaymentOrder[];
  totalPayments: number;
  isLoading: boolean;
  selectedPayments: string[];
  generatingInvoices: string[];
  sendingInvoices: string[];
  activeFilterCount: number;
  onToggleSelection: (paymentId: string) => void;
  onGenerateInvoice: (paymentId: string) => void;
  onSendInvoice: (paymentId: string) => void;
  onUpdateStatus: (paymentId: string, status: string) => void;
  onClearFilters: () => void;
}

export function PaymentRecordsList({
  payments,
  totalPayments,
  isLoading,
  selectedPayments,
  generatingInvoices,
  sendingInvoices,
  activeFilterCount,
  onToggleSelection,
  onGenerateInvoice,
  onSendInvoice,
  onUpdateStatus,
  onClearFilters
}: PaymentRecordsListProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            Payment Records 
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Bell className="w-4 h-4 text-green-500" />
            {payments.length !== totalPayments && (
              <Badge variant="outline" className="ml-2">
                {payments.length} of {totalPayments}
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
            <p>{totalPayments === 0 ? "No payment records found." : "No payment records match your search criteria."}</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={onClearFilters} className="mt-2">
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map(payment => (
              <PaymentRecordCard
                key={payment.id}
                payment={payment}
                isSelected={selectedPayments.includes(payment.id)}
                onToggleSelection={onToggleSelection}
                onGenerateInvoice={onGenerateInvoice}
                onSendInvoice={onSendInvoice}
                onUpdateStatus={onUpdateStatus}
                generatingInvoices={generatingInvoices}
                sendingInvoices={sendingInvoices}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
