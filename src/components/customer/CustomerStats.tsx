
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building, UserCheck, UserX } from "lucide-react";

interface CustomerStatsProps {
  customers: any[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  const totalCustomers = customers.length;
  const tradeCustomers = customers.filter(c => c.customer_type === "trade").length;
  const accountCustomers = customers.filter(c => c.customer_type === "account").length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const inactiveCustomers = totalCustomers - activeCustomers;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total</p>
              <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Trade</p>
              <p className="text-2xl font-bold text-slate-800">{tradeCustomers}</p>
            </div>
            <Building className="w-6 h-6 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Account</p>
              <p className="text-2xl font-bold text-slate-800">{accountCustomers}</p>
            </div>
            <UserCheck className="w-6 h-6 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active</p>
              <p className="text-2xl font-bold text-slate-800">{activeCustomers}</p>
            </div>
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inactive</p>
              <p className="text-2xl font-bold text-slate-800">{inactiveCustomers}</p>
            </div>
            <UserX className="w-6 h-6 text-red-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
