import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeletedOrdersDialog } from "./DeletedOrdersDialog";
import { MonthlySheetSyncDialog } from "./MonthlySheetSyncDialog";
import { YardSaleFastTrack } from "./YardSaleFastTrack";
import { useOrderManagement } from "./OrderManagementProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Zap } from "lucide-react";

interface OrderManagementHeaderProps {
  onCreateOrder: () => void;
  filteredOrders?: any[];
}

export function OrderManagementHeader({ onCreateOrder, filteredOrders }: OrderManagementHeaderProps) {
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [yardSaleOpen, setYardSaleOpen] = useState(false);
  const { refetch } = useOrderManagement();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-bold text-foreground text-lg">Order Management</h2>
        <p className="text-muted-foreground mt-1">Create and manage customer orders • Real-time updates enabled</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setMonthlyOpen(true)} size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Monthly Sync
        </Button>
        <DeletedOrdersDialog />
        <Button variant="secondary" onClick={() => setYardSaleOpen(true)}>
          <Zap className="h-4 w-4 mr-2" />
          Yard Sale
        </Button>
        <Button onClick={onCreateOrder} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Create New Order
        </Button>
      </div>
      <MonthlySheetSyncDialog open={monthlyOpen} onOpenChange={setMonthlyOpen} />
      <Dialog open={yardSaleOpen} onOpenChange={setYardSaleOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Yard Sale
            </DialogTitle>
          </DialogHeader>
          {yardSaleOpen && (
            <YardSaleFastTrack onClose={() => setYardSaleOpen(false)} onCompleted={refetch} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
