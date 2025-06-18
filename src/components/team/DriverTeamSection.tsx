
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, RefreshCw, Truck } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'admin' | 'driver' | 'customer';
  created_at: string;
}

interface DriverTeamSectionProps {
  drivers: Profile[];
  onUpdateRole: (userId: string, newRole: 'admin' | 'driver' | 'customer') => void;
  onDeleteUser: (userId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function DriverTeamSection({ 
  drivers, 
  onUpdateRole, 
  onDeleteUser, 
  onRefresh, 
  refreshing 
}: DriverTeamSectionProps) {
  if (drivers.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Drivers Found</h3>
        <p className="text-gray-500 mb-4">
          There are no team members with driver role in the system.
        </p>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {drivers.length} driver{drivers.length !== 1 ? 's' : ''} available for deliveries
        </p>
      </div>

      {drivers.map((driver) => (
        <Card key={driver.id} className="border-blue-100 hover:bg-blue-50/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{driver.full_name || 'No name'}</h3>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    Driver
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={driver.role} 
                  onValueChange={(value: 'admin' | 'driver' | 'customer') => onUpdateRole(driver.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium">{driver.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-medium">{driver.phone || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-500">Joined</p>
                <p className="font-medium">{new Date(driver.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Edit Profile</Button>
              <Button size="sm" variant="outline">View Deliveries</Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onDeleteUser(driver.id)}
              >
                Remove Driver
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
