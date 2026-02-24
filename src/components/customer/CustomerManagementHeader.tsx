import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Key } from "lucide-react";
import { BulkPinManagementDialog } from "./BulkPinManagementDialog";

interface CustomerManagementHeaderProps {
  onAddCustomer: () => void;
  onImportCustomers?: () => void;
}

export function CustomerManagementHeader({ onAddCustomer, onImportCustomers }: CustomerManagementHeaderProps) {
  const [bulkPinOpen, setBulkPinOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your customer database and relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setBulkPinOpen(true)} variant="outline" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Bulk PIN
          </Button>
          {onImportCustomers && (
            <Button onClick={onImportCustomers} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          )}
          <Button onClick={onAddCustomer} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>
      <BulkPinManagementDialog open={bulkPinOpen} onOpenChange={setBulkPinOpen} />
    </>
  );
}
