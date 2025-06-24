
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";

interface PaymentActionsProps {
  selectedPayments: string[];
  sendingInvoices: string[];
  onBatchInvoice: () => void;
  onShowSettings: () => void;
}

export function PaymentActions({
  selectedPayments,
  sendingInvoices,
  onBatchInvoice,
  onShowSettings
}: PaymentActionsProps) {
  return (
    <div className="flex gap-3">
      <Button 
        onClick={onBatchInvoice} 
        variant="outline" 
        disabled={selectedPayments.length === 0 || selectedPayments.some(id => sendingInvoices.includes(id))} 
        className="flex items-center gap-2"
      >
        {selectedPayments.some(id => sendingInvoices.includes(id)) && <Loader2 className="w-4 h-4 animate-spin" />}
        Batch Invoice ({selectedPayments.length})
      </Button>
      <Button 
        onClick={onShowSettings} 
        variant="outline"
        className="flex items-center gap-2"
      >
        <Settings className="w-4 h-4" />
        Settings
      </Button>
    </div>
  );
}
