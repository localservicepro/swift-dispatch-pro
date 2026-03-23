import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeletedOrdersDialog } from "./DeletedOrdersDialog";
import { MonthlySheetSyncDialog } from "./MonthlySheetSyncDialog";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Loader2, Calendar } from "lucide-react";
import { syncAllOrdersToSheets } from "@/utils/googleSheetsSync";

interface OrderManagementHeaderProps {
  onCreateOrder: () => void;
  filteredOrders?: any[];
}

export function OrderManagementHeader({ onCreateOrder, filteredOrders }: OrderManagementHeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const { toast } = useToast();

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      const result = await syncAllOrdersToSheets(false);
      toast({ title: "Synced to Google Sheets", description: `${result.synced} orders synced successfully` });
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

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
        <Button variant="outline" onClick={handleSyncToSheets} disabled={syncing} size="sm">
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          Sync to Sheets
        </Button>
        <DeletedOrdersDialog />
        <Button onClick={onCreateOrder} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Create New Order
        </Button>
      </div>
      <MonthlySheetSyncDialog open={monthlyOpen} onOpenChange={setMonthlyOpen} />
    </div>
  );
}
