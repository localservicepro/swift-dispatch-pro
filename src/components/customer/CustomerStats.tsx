import { Card, CardContent } from "@/components/ui/card";
import { Users, Building, UserCheck, UserX, Home, Wrench } from "lucide-react";
import { useCustomerStatsCounts } from "@/hooks/useCustomersData";

export function CustomerStats() {
  const { data, isLoading } = useCustomerStatsCounts();

  const stat = (n: number | undefined) =>
    isLoading ? "…" : (n ?? 0).toLocaleString();

  const items = [
    { label: "Total", value: data?.total, Icon: Users, color: "text-blue-600" },
    { label: "Residential", value: data?.residential, Icon: Home, color: "text-green-600" },
    { label: "Trade", value: data?.trade, Icon: Wrench, color: "text-orange-600" },
    { label: "Account", value: data?.account, Icon: Building, color: "text-purple-600" },
    { label: "Active", value: data?.active, Icon: UserCheck, color: "text-green-600" },
    { label: "Inactive", value: data?.inactive, Icon: UserX, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map(({ label, value, Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat(value)}</p>
              </div>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
