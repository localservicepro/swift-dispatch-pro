
import { Button } from "@/components/ui/button";
import { DeletedOrdersDialog } from "./DeletedOrdersDialog";

interface OrderManagementHeaderProps {
  onCreateOrder: () => void;
}

export function OrderManagementHeader({ onCreateOrder }: OrderManagementHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-bold text-slate-800 text-lg">Order Management</h2>
        <p className="text-slate-600 mt-1">Create and manage customer orders • Real-time updates enabled</p>
      </div>
      <div className="flex items-center gap-3">
        <DeletedOrdersDialog />
        <Button onClick={onCreateOrder} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          Create New Order
        </Button>
      </div>
    </div>
  );
}
