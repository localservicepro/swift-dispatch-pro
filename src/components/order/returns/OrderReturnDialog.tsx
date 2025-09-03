import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReturnItemSelector } from "./ReturnItemSelector";
import { ReturnSummary } from "./ReturnSummary";
import { useOrderReturns } from "@/hooks/useOrderReturns";
import { Package, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  original_quantity: number;
  quantity_returned: number;
  unit_price: number;
}

interface OrderReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    products: any[];
  };
  onReturnCreated: () => void;
}

export function OrderReturnDialog({
  open,
  onOpenChange,
  order,
  onReturnCreated
}: OrderReturnDialogProps) {
  const [step, setStep] = useState<'selection' | 'summary'>('selection');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { returns, isLoading, getReturnableQuantities } = useOrderReturns(order.id);

  // Transform order products to the format expected by ReturnItemSelector
  const products: Product[] = order.products.map(product => ({
    id: product.id,
    name: product.name,
    quantity: product.quantity || 1,
    price: product.price || product.unit_price || 0
  }));

  // Calculate returnable quantities based on existing returns
  const returnableQuantities = useMemo(() => {
    return getReturnableQuantities(order.products);
  }, [returns, order.products, getReturnableQuantities]);

  // Check if any items are available for return
  const hasReturnableItems = useMemo(() => {
    return Object.values(returnableQuantities).some(data => data.returnableQty > 0);
  }, [returnableQuantities]);

  const handleNext = () => {
    if (returnItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to return.",
        variant: "destructive"
      });
      return;
    }

    // Validate return quantities against available quantities
    const invalidItems = returnItems.filter(item => {
      const returnableData = returnableQuantities[item.product_id];
      return !returnableData || item.quantity_returned > returnableData.returnableQty;
    });

    if (invalidItems.length > 0) {
      toast({
        title: "Invalid Return Quantities",
        description: "Some items exceed the available return quantity. Please adjust the quantities.",
        variant: "destructive"
      });
      return;
    }

    setStep('summary');
  };

  const handleBack = () => {
    setStep('selection');
  };

  const handleSubmit = async () => {
    if (returnItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to return.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const totalItems = returnItems.reduce((sum, item) => sum + item.quantity_returned, 0);

      const { error } = await supabase
        .from('order_returns')
        .insert({
          order_id: order.id,
          returned_items: returnItems as any,
          return_reason: returnReason,
          return_notes: returnNotes,
          total_items_returned: totalItems,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Return Created",
        description: `Return request created for ${totalItems} items. Items will be added back to inventory when processed.`,
      });

      onReturnCreated();
      onOpenChange(false);
      
      // Reset form
      setStep('selection');
      setReturnItems([]);
      setReturnReason('');
      setReturnNotes('');
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: "Error",
        description: "Failed to create return. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('selection');
    setReturnItems([]);
    setReturnReason('');
    setReturnNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Items - Order #{order.order_number}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Customer: {order.customer_name}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading && (
            <div className="text-center py-4">Loading return history...</div>
          )}

          {!isLoading && !hasReturnableItems && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                All items from this order have already been returned. No additional returns can be processed.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && hasReturnableItems && step === 'selection' && (
            <>
              <ReturnItemSelector
                products={products}
                returnItems={returnItems}
                onReturnItemsChange={setReturnItems}
                returnableQuantities={returnableQuantities}
              />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="return-reason">Return Reason</Label>
                  <Select value={returnReason} onValueChange={setReturnReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excess_quantity">Ordered more than needed</SelectItem>
                      <SelectItem value="wrong_product">Wrong product delivered</SelectItem>
                      <SelectItem value="damaged">Product damaged</SelectItem>
                      <SelectItem value="not_needed">No longer needed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="return-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="return-notes"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Add any additional notes about the return..."
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {!isLoading && step === 'summary' && (
            <ReturnSummary
              returnItems={returnItems}
              returnReason={returnReason}
              returnNotes={returnNotes}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {!isLoading && hasReturnableItems && step === 'selection' && (
            <Button 
              onClick={handleNext}
              disabled={returnItems.length === 0}
              className="flex items-center gap-2"
            >
              Next: Review Return
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          
          {step === 'summary' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? 'Creating Return...' : 'Create Return'}
                <Package className="h-4 w-4" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}