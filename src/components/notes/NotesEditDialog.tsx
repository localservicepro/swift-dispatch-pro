
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, MessageSquare, AlertCircle } from "lucide-react";

interface NotesEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  currentNotes: {
    orderNotes?: string;
    deliveryNotes?: string;
    specialInstructions?: string;
  };
  onNotesUpdated: () => void;
}

export function NotesEditDialog({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  currentNotes,
  onNotesUpdated
}: NotesEditDialogProps) {
  const [orderNotes, setOrderNotes] = useState(currentNotes.orderNotes || "");
  const [deliveryNotes, setDeliveryNotes] = useState(currentNotes.deliveryNotes || "");
  const [specialInstructions, setSpecialInstructions] = useState(currentNotes.specialInstructions || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setOrderNotes(currentNotes.orderNotes || "");
      setDeliveryNotes(currentNotes.deliveryNotes || "");
      setSpecialInstructions(currentNotes.specialInstructions || "");
    }
  }, [isOpen, currentNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_notes: orderNotes.trim() || null,
          delivery_notes: deliveryNotes.trim() || null,
          special_instructions: specialInstructions.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Notes Updated",
        description: `Notes for order ${orderNumber} have been updated successfully`,
      });

      onNotesUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Edit Notes - Order {orderNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="order-notes" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-3 h-3 text-blue-600" />
              Order Notes (Internal)
            </Label>
            <Textarea
              id="order-notes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Internal notes about this order..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-notes" className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-3 h-3 text-green-600" />
              Delivery Notes (For Driver)
            </Label>
            <Textarea
              id="delivery-notes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Notes for the delivery driver..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special-instructions" className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-3 h-3 text-orange-600" />
              Special Instructions (Customer)
            </Label>
            <Textarea
              id="special-instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Special instructions from customer..."
              className="min-h-[80px] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                Saving...
              </div>
            ) : (
              "Save Notes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
