import { useState } from "react";
import { MultiStepOrderForm } from "./MultiStepOrderForm";
import { OrderEditDialog } from "./OrderEditDialog";
import { EnhancedDeleteOrderDialog } from "./EnhancedDeleteOrderDialog";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { useOrderManagement } from "./OrderManagementProvider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const DRAFT_STORAGE_KEY = "order_form_draft";

// Returns true when the persisted draft has user-entered content worth keeping.
function draftHasContent(): boolean {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    return !!(d?.selectedCustomer || (Array.isArray(d?.cart) && d.cart.length > 0));
  } catch {
    return false;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function OrderManagementDialogs() {
  const {
    isCreating,
    setIsCreating,
    editingOrder,
    setEditingOrder,
    deletingOrder,
    setDeletingOrder,
    isDeleting,
    editingNotes,
    setEditingNotes,
    handleDeleteOrder,
    refetch,
  } = useOrderManagement();

  const { toast } = useToast();
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleOrderCreated = () => {
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!",
    });
  };

  const handleOrderUpdated = () => {
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!",
    });
  };

  const handleNotesUpdated = () => {
    refetch();
    setEditingNotes(null);
  };

  // Intercept dialog close attempts (X button, Escape, click-outside).
  const handleCreateOpenChange = (open: boolean) => {
    if (open) {
      setIsCreating(true);
      return;
    }
    // Closing — only prompt if there is real draft content.
    if (draftHasContent()) {
      setShowCloseConfirm(true);
    } else {
      setIsCreating(false);
    }
  };

  const handleSaveForLater = () => {
    setShowCloseConfirm(false);
    setIsCreating(false);
    toast({
      title: "Saved for later",
      description: "Your order draft will resume next time you click Create Order.",
    });
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowCloseConfirm(false);
    setIsCreating(false);
    toast({
      title: "Draft discarded",
      description: "Your in-progress order was cleared.",
    });
  };

  return (
    <>
      {/* Create Order Dialog */}
      <Dialog open={isCreating} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <MultiStepOrderForm
            onOrderCreated={handleOrderCreated}
            onClose={() => handleCreateOpenChange(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Save-for-later confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this order for later?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Save your progress and resume later, or discard
              and start fresh next time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardDraft}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveForLater}>
              Save for later
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Order Dialog */}
      {editingOrder && (
        <OrderEditDialog
          order={editingOrder}
          onOrderUpdated={handleOrderUpdated}
          onClose={() => setEditingOrder(null)}
        />
      )}

      {/* Delete Order Dialog */}
      <EnhancedDeleteOrderDialog
        order={deletingOrder}
        open={!!deletingOrder}
        onOpenChange={() => setDeletingOrder(null)}
        onConfirmDelete={handleDeleteOrder}
        isDeleting={isDeleting}
      />

      {/* Notes Edit Dialog */}
      {editingNotes && (
        <NotesEditDialog
          isOpen={!!editingNotes}
          onClose={() => setEditingNotes(null)}
          orderId={editingNotes.id}
          orderNumber={editingNotes.order_number}
          currentNotes={{
            orderNotes: editingNotes.order_notes,
            deliveryNotes: editingNotes.delivery_notes,
          }}
          onNotesUpdated={handleNotesUpdated}
        />
      )}
    </>
  );
}
