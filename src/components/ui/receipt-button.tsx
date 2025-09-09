import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Receipt, Download, Printer, Mail, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  icon = true
}: ReceiptButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleAction = async (action: 'view' | 'download' | 'print' | 'email', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (isGenerating || isSending) return;

    try {
      if (action === 'email') {
        if (!customerEmail) {
          toast({
            title: "No Email Address",
            description: "Customer email is not available for this order.",
            variant: "destructive"
          });
          return;
        }
        
        setIsSending(true);
        await ReceiptService.emailReceipt(orderId, customerEmail);
        toast({
          title: "Receipt Sent",
          description: `Receipt for ${orderNumber} has been sent to ${customerEmail}`
        });
        return;
      }

      setIsGenerating(true);
      
      // Generate receipt
      const { receiptUrl } = invoiceId 
        ? await ReceiptService.generateReceiptFromInvoice(invoiceId)
        : await ReceiptService.generateReceiptFromOrder(orderId);

      switch (action) {
        case 'view':
          window.open(receiptUrl, '_blank');
          break;
        case 'download':
          await ReceiptService.downloadReceipt(receiptUrl, orderNumber);
          toast({
            title: "Receipt Downloaded",
            description: `Receipt for ${orderNumber} has been downloaded`
          });
          break;
        case 'print':
          await ReceiptService.printReceipt(receiptUrl);
          break;
      }
    } catch (error: any) {
      console.error('Receipt action error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setIsSending(false);
    }
  };

  const isLoading = isGenerating || isSending;

  // Single action button (for quick access)
  if (!showLabel && variant === "ghost") {
    return (
      <Button
        variant="ghost"
        size={size}
        className={cn("h-6 w-6 p-0", className)}
        onClick={(e) => handleAction('view', e)}
        disabled={isLoading}
        title="View Receipt"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : icon ? (
          <Receipt className="w-3 h-3" />
        ) : null}
      </Button>
    );
  }

  // Dropdown menu with multiple options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn("flex items-center gap-2", className)}
          disabled={isLoading}
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : icon ? (
            <Receipt className="w-4 h-4" />
          ) : null}
          {showLabel && (isLoading ? 'Processing...' : 'Receipt')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={(e) => handleAction('view', e)} className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleAction('print', e)} className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Print Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => handleAction('download', e)} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Receipt
        </DropdownMenuItem>
        {customerEmail && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => handleAction('email', e)} 
              className="flex items-center gap-2"
              disabled={isSending}
            >
              <Mail className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Email Receipt'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}