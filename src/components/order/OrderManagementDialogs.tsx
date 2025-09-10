
import { MultiStepOrderForm } from "./MultiStepOrderForm";
import { OrderEditDialog } from "./OrderEditDialog";
import { EnhancedDeleteOrderDialog } from "./EnhancedDeleteOrderDialog";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { useOrderManagement } from "./OrderManagementProvider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    refetch
  } = useOrderManagement();
  
  const { toast } = useToast();

  const handleOrderCreated = () => {
    refetch();
    toast({
      title: "Success",
      description: "Order created successfully!"
    });
  };

  const handleOrderUpdated = () => {
    refetch();
    setEditingOrder(null);
    toast({
      title: "Success",
      description: "Order updated successfully!"
    });
  };

  const handleNotesUpdated = () => {
    refetch();
    setEditingNotes(null);
  };

  return (
    <>
      {/* Create Order Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <MultiStepOrderForm onOrderCreated={handleOrderCreated} onClose={() => setIsCreating(false)} />
        </DialogContent>
      </Dialog>

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
            deliveryNotes: editingNotes.delivery_notes
          }}
          onNotesUpdated={handleNotesUpdated}
        />
      )}
    </>
  );
}
