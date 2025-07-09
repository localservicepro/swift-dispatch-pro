
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

interface CustomerManagementHeaderProps {
  onAddCustomer: () => void;
}

export function CustomerManagementHeader({ onAddCustomer }: CustomerManagementHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="font-bold text-slate-800 text-lg">Customer Management</h1>
        <p className="text-slate-600">Manage Residential, Trade, and Account customers</p>
      </div>
      <Button onClick={onAddCustomer} className="flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        Add Customer
      </Button>
    </div>
  );
}
