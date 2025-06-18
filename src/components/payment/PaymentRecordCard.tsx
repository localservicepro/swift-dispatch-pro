
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Receipt } from "lucide-react";

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

interface PaymentRecordCardProps {
  payment: PaymentOrder;
  isSelected: boolean;
  onToggleSelection: (paymentId: string) => void;
  onGenerateInvoice: (paymentId: string) => void;
  onSendInvoice: (paymentId: string) => void;
  onUpdateStatus: (paymentId: string, status: string) => void;
  generatingInvoices: string[];
  sendingInvoices: string[];
}

export function PaymentRecordCard({
  payment,
  isSelected,
  onToggleSelection,
  onGenerateInvoice,
  onSendInvoice,
  onUpdateStatus,
  generatingInvoices,
  sendingInvoices
}: PaymentRecordCardProps) {
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
    <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isSelected} 
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
  );
}
