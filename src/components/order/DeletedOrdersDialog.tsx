
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { DeletedOrdersList } from "@/components/opportunity/DeletedOrdersList";
import { useDeletedOrdersData } from "@/components/opportunity/useDeletedOrdersData";

export function DeletedOrdersDialog() {
  const [open, setOpen] = useState(false);
  const { deletedOrders } = useDeletedOrdersData();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Deleted Orders
          {deletedOrders.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {deletedOrders.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Deleted Orders Management
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <DeletedOrdersList />
        </div>
      </DialogContent>
    </Dialog>
  );
}
