import { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccountStatementExport } from "@/hooks/useAccountStatementExport";

interface AccountStatementExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    business_name?: string;
  };
}

export function AccountStatementExportDialog({
  open,
  onOpenChange,
  customer,
}: AccountStatementExportDialogProps) {
  const {
    selectedMonth,
    setSelectedMonth,
    setThisMonth,
    setLastMonth,
    previewData,
    isLoadingPreview,
    isGenerating,
    generateStatement,
  } = useAccountStatementExport({ customerId: customer.id });

  const customerName = customer.company_name || customer.business_name || 
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleGenerate = async () => {
    await generateStatement();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Account Statement
          </DialogTitle>
          <DialogDescription>
            Generate a monthly statement for <strong>{customerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Month Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Statement Period</label>
            
            {/* Quick Select Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={setThisMonth}
                className="flex-1"
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setLastMonth}
                className="flex-1"
              >
                Last Month
              </Button>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {format(selectedMonth, "MMMM yyyy")}
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium mb-3">Preview</h4>
            {isLoadingPreview ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders Found:</span>
                  <span className="font-medium">{previewData?.orderCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-lg">
                    ${(previewData?.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>${(previewData?.paidAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Pending:</span>
                  <span>${(previewData?.pendingAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isLoadingPreview || !previewData?.orderCount}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </>
            )}
          </Button>

          {previewData?.orderCount === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No orders found for this period.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
