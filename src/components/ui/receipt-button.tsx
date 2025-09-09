import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  
} from "@/components/ui/dropdown-menu";
import { Receipt, Download, Printer, Loader2 } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
import { ReceiptService } from "@/services/receiptService";
import { cn } from "@/lib/utils";

interface ReceiptButtonProps {
  orderId: string;
  invoiceId?: string;
  orderNumber: string;
  customerEmail?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  showLabel?: boolean;
  icon?: boolean;
  thermalPrint?: boolean;
}

export function ReceiptButton({ 
  orderId, 
  invoiceId, 
  orderNumber, 
  customerEmail,
  variant = "outline",
  size = "sm", 
  className,
  showLabel = false,
  icon = true,
  thermalPrint = false
}: ReceiptButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAction = async (action: 'download' | 'print', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      
      // Generate PDF receipt
      const { receiptUrl } = invoiceId 
        ? await ReceiptService.generateReceiptFromInvoice(invoiceId, false)
        : await ReceiptService.generateReceiptFromOrder(orderId, false);

      if (action === 'download') {
        await ReceiptService.downloadReceipt(receiptUrl, orderNumber);
        console.log(`Receipt downloaded for order ${orderNumber}`);
      } else if (action === 'print') {
        await ReceiptService.printReceipt(receiptUrl);
        console.log(`Receipt printed for order ${orderNumber}`);
      }
    } catch (error: any) {
      console.error('Receipt action error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  

  // Single action button (for quick access)
  if (!showLabel && variant === "ghost") {
    return (
      <Button
        variant="ghost"
        size={size}
        className={cn("h-6 w-6 p-0", className)}
        onClick={(e) => handleAction('print', e)}
        disabled={isGenerating}
        title="Print Receipt"
      >
        {isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : icon ? (
          <Receipt className="w-3 h-3" />
        ) : null}
      </Button>
    );
  }

  // Simplified dropdown with only Print and Download
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn("flex items-center gap-2", className)}
          disabled={isGenerating}
          onClick={(e) => e.stopPropagation()}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : icon ? (
            <Receipt className="w-4 h-4" />
          ) : null}
          {showLabel && (isGenerating ? 'Generating...' : 'Receipt')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={(e) => handleAction('print', e)} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleAction('download', e)} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Receipt
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}