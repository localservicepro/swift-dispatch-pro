import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptService, ReceiptData } from "@/services/receiptService";

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  invoiceId?: string;
  orderNumber: string;
  customerEmail?: string;
}

export function ReceiptPreviewDialog({
  open,
  onOpenChange,
  orderId,
  invoiceId,
  orderNumber,
  customerEmail
}: ReceiptPreviewDialogProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !receiptData) {
      loadReceipt();
    }
  }, [open]);

  const loadReceipt = async () => {
    setIsLoading(true);
    try {
      const result = invoiceId 
        ? await ReceiptService.generateReceiptFromInvoice(invoiceId)
        : await ReceiptService.generateReceiptFromOrder(orderId);
      
      setReceiptData(result.receiptData);
      setReceiptUrl(result.receiptUrl);
    } catch (error: any) {
      console.error('Failed to load receipt:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load receipt preview",
        variant: "destructive"
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'download' | 'print' | 'email') => {
    if (!receiptUrl || !receiptData) return;
    
    setIsProcessing(true);
    try {
      switch (action) {
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
        case 'email':
          if (customerEmail) {
            await ReceiptService.emailReceipt(orderId, customerEmail);
            toast({
              title: "Receipt Sent",
              description: `Receipt for ${orderNumber} has been sent to ${customerEmail}`
            });
          }
          break;
      }
    } catch (error: any) {
      console.error('Receipt action error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process receipt action",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getReceiptTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice': return 'Invoice Receipt';
      case 'payment': return 'Payment Receipt';
      default: return 'Order Receipt';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {receiptData ? getReceiptTypeLabel(receiptData.receiptType) : 'Receipt'} - {orderNumber}
            </span>
            <div className="flex items-center gap-2">
              {receiptUrl && !isLoading && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('download')}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction('print')}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  {customerEmail && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('email')}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Generating receipt...</p>
              </div>
            </div>
          ) : receiptUrl ? (
            <iframe
              src={receiptUrl}
              className="w-full h-full border-0"
              title="Receipt Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Failed to load receipt preview</p>
            </div>
          )}
        </div>

        {receiptData && !isLoading && (
          <div className="text-xs text-muted-foreground text-center py-2">
            {receiptData.receiptType === 'order' && receiptData.paymentStatus !== 'paid' && (
              <span className="text-orange-600">⚠️ This is an order receipt. Payment is {receiptData.paymentStatus}.</span>
            )}
            {receiptData.receiptType === 'payment' && (
              <span className="text-green-600">✅ This is a payment confirmation receipt.</span>
            )}
            {receiptData.receiptType === 'invoice' && (
              <span className="text-blue-600">📄 This is an invoice receipt.</span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}