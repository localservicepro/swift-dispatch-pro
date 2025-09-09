import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { ReceiptService } from "@/services/receiptService";
import { cn } from "@/lib/utils";

interface ReceiptButtonProps {
  orderId: string;
  invoiceId?: string;
  orderNumber: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  showLabel?: boolean;
  icon?: boolean;
}

export function ReceiptButton({ 
  orderId, 
  invoiceId, 
  orderNumber, 
  variant = "outline",
  size = "sm", 
  className,
  showLabel = false,
  icon = true
}: ReceiptButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (isPrinting) return;

    try {
      setIsPrinting(true);
      
      // Generate and print receipt
      const { receiptUrl } = invoiceId 
        ? await ReceiptService.generateReceiptFromInvoice(invoiceId)
        : await ReceiptService.generateReceiptFromOrder(orderId);

      await ReceiptService.printReceipt(receiptUrl);
      console.log(`Receipt printed for order ${orderNumber}`);
    } catch (error: any) {
      console.error('Receipt print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("flex items-center gap-2", className)}
      onClick={handlePrint}
      disabled={isPrinting}
      title="Print Receipt"
    >
      {isPrinting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <Printer className="w-4 h-4" />
      ) : null}
      {showLabel && (isPrinting ? 'Printing...' : 'Print Receipt')}
    </Button>
  );
}