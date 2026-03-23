
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeletedOrdersDialog } from "./DeletedOrdersDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Loader2 } from "lucide-react";

interface OrderManagementHeaderProps {
  onCreateOrder: () => void;
  filteredOrders?: any[];
}

export function OrderManagementHeader({ onCreateOrder, filteredOrders }: OrderManagementHeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSyncToSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'sync-bulk', orders: filteredOrders },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      toast({ title: "Synced to Google Sheets", description: `${data.synced} orders synced successfully` });
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-bold text-slate-800 text-lg">Order Management</h2>
        <p className="text-slate-600 mt-1">Create and manage customer orders • Real-time updates enabled</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleSyncToSheets} disabled={syncing} size="sm">
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
          Sync to Sheets
        </Button>
        <DeletedOrdersDialog />
        <Button onClick={onCreateOrder} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          Create New Order
        </Button>
      </div>
    </div>
  );
}
