
import { MultiStepOrderForm } from "./MultiStepOrderForm";
import { OrderEditDialog } from "./OrderEditDialog";
import { EnhancedDeleteOrderDialog } from "./EnhancedDeleteOrderDialog";
import { NotesEditDialog } from "../notes/NotesEditDialog";
import { useOrderManagement } from "./OrderManagementProvider";
import { useToast } from "@/hooks/use-toast";

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
      {/* Create Order Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Order</h2>
                <button onClick={() => setIsCreating(false)}>Close</button>
              </div>
              <MultiStepOrderForm onOrderCreated={handleOrderCreated} onClose={() => setIsCreating(false)} />
            </div>
          </div>
        </div>
      )}

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
            specialInstructions: editingNotes.special_instructions
          }}
          onNotesUpdated={handleNotesUpdated}
        />
      )}
    </>
  );
}
