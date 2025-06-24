import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SplitOrderGroup } from "@/components/order/utils/splitOrderUtils";
import { createBatchInvoiceForSplitOrder } from "@/components/order/utils/splitOrderUtils";
import { Badge } from "@/components/ui/badge";

interface SplitOrderGroupCardProps {
  group: SplitOrderGroup;
  onInvoiceCreated?: () => void;
}

export function SplitOrderGroupCard({ group, onInvoiceCreated }: SplitOrderGroupCardProps) {
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const { toast } = useToast();

  const handleCreateBatchInvoice = async () => {
    setIsCreatingInvoice(true);
    
    try {
      console.log('Starting batch invoice creation process...');
      
      const result = await createBatchInvoiceForSplitOrder(group);
      
      console.log('Batch invoice created successfully:', result);
      
      toast({
        title: "Batch Invoice Created",
        description: `Invoice ${result.invoice.invoice_number} created successfully. Opening payment page...`,
      });

      // Open payment URL in new tab
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank');
      }

      // Notify parent component to refresh data
      onInvoiceCreated?.();
      
    } catch (error: any) {
      console.error('Batch invoice creation failed:', error);
      
      toast({
        title: "Invoice Creation Failed",
        description: error.message || "Failed to create batch invoice. Please check the logs and try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-2">
        Split Order Group - {group.masterOrder.order_number}
      </h3>
      <p className="text-sm text-gray-500">
        Total Amount: ${group.totalAmount.toFixed(2)}
      </p>
      <p className="text-sm text-gray-500">
        Orders: {group.allOrders.map(o => o.order_number).join(', ')}
      </p>
      <div className="mt-2">
        {group.hasExistingInvoice ? (
          <Badge variant="secondary">Invoice Already Exists</Badge>
        ) : group.canInvoice ? (
          <Button 
            onClick={handleCreateBatchInvoice} 
            disabled={isCreatingInvoice}
          >
            {isCreatingInvoice ? "Creating Invoice..." : "Create Batch Invoice"}
          </Button>
        ) : (
          <Badge variant="destructive">Cannot Invoice</Badge>
        )}
      </div>
    </div>
  );
}
