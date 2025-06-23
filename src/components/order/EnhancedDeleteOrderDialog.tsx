
import { useState, useEffect } from "react";
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
import { Trash2, Split, Link2 } from "lucide-react";
import { useSplitOrderGroups, SplitOrderGroupInfo } from "@/hooks/useSplitOrderGroups";

interface EnhancedDeleteOrderDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (orderId: string, deleteType: 'single' | 'group') => void;
  isDeleting: boolean;
}

export function EnhancedDeleteOrderDialog({
  order,
  open,
  onOpenChange,
  onConfirmDelete,
  isDeleting
}: EnhancedDeleteOrderDialogProps) {
  const [groupInfo, setGroupInfo] = useState<SplitOrderGroupInfo | null>(null);
  const [deleteType, setDeleteType] = useState<'single' | 'group'>('single');
  const { getSplitOrderGroupInfo } = useSplitOrderGroups();

  useEffect(() => {
    if (open && order) {
      getSplitOrderGroupInfo(order.id).then(setGroupInfo);
    }
  }, [open, order, getSplitOrderGroupInfo]);

  if (!order || !groupInfo) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loading...</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isMasterOrder = !order.master_order_id;
  const isPartOfGroup = groupInfo.isPartOfGroup;

  const handleConfirm = () => {
    onConfirmDelete(order.id, deleteType);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Delete Order
            {isPartOfGroup && <Split className="w-4 h-4 text-blue-600" />}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p><strong>Order:</strong> {order.order_number}</p>
              <p><strong>Customer:</strong> {order.customer_name}</p>
              <p><strong>Amount:</strong> ${order.total_amount.toFixed(2)}</p>
            </div>

            {isPartOfGroup && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Split Order Group</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  This order is part of a split group with {groupInfo.totalOrders} total orders:
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  {groupInfo.orderNumbers.map(orderNum => (
                    <div key={orderNum} className="flex items-center gap-1">
                      <span>•</span>
                      <span>{orderNum}</span>
                      {orderNum === order.order_number && <span className="text-blue-800 font-medium">(current)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isPartOfGroup && (
              <div className="space-y-2">
                <p className="font-medium">Choose deletion option:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="single"
                      checked={deleteType === 'single'}
                      onChange={(e) => setDeleteType(e.target.value as 'single' | 'group')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Delete only this order</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="group"
                      checked={deleteType === 'group'}
                      onChange={(e) => setDeleteType(e.target.value as 'single' | 'group')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Delete entire split order group ({groupInfo.totalOrders} orders)</span>
                  </label>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Deleted orders can be restored from the deleted orders section.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                Deleting...
              </div>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-1" />
                {deleteType === 'group' && isPartOfGroup ? 
                  `Delete Group (${groupInfo.totalOrders})` : 
                  'Delete Order'
                }
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
