import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { syncMonthlyOrdersToSheets } from "@/utils/googleSheetsSync";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthlySheetSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlySheetSyncDialog({ open, onOpenChange }: MonthlySheetSyncDialogProps) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [tabName, setTabName] = useState(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleMonthOrYearChange = (newMonth: string, newYear: string) => {
    setMonth(newMonth);
    setYear(newYear);
    setTabName(`${MONTHS[parseInt(newMonth)]} ${newYear}`);
  };

  const handleSync = async () => {
    if (!tabName.trim()) {
      toast({ title: "Tab name required", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const result = await syncMonthlyOrdersToSheets(
        parseInt(year),
        parseInt(month) + 1,
        tabName.trim(),
        false
      );
      toast({
        title: "Monthly Sync Complete",
        description: `${result.synced} orders synced to "${tabName}" tab`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Sheets Sync
          </DialogTitle>
          <DialogDescription>
            Sync orders for a specific month to a separate sheet tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={(v) => handleMonthOrYearChange(v, year)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => handleMonthOrYearChange(month, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sheet Tab Name</Label>
            <Input value={tabName} onChange={(e) => setTabName(e.target.value)} placeholder="e.g. March 2026" />
            <p className="text-xs text-muted-foreground">
              This tab will be created in your spreadsheet if it doesn't exist.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={syncing}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sync {MONTHS[parseInt(month)]} {year}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
