import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Driver {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface DriverSelectorProps {
  selectedDriverId: string;
  onDriverChange: (driverId: string) => void;
  deliveryDate?: string;
  deliveryTime?: string;
  excludeOrderId?: string;
}

export function DriverSelector({ 
  selectedDriverId, 
  onDriverChange,
  deliveryDate,
  deliveryTime,
  excludeOrderId
}: DriverSelectorProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      setDriversError(null);

      console.log('Loading profiles at', Date.now() + '...');
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at, phone')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });

      console.log('Profiles query result:', { data: allUsers, error, count: allUsers?.length });

      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      if (!allUsers || allUsers.length === 0) {
        setDriversError('No users available for driver assignment. Please create some user accounts first.');
        setDrivers([]);
        return;
      }

      const driversList = allUsers.filter(user => user.role === 'driver');
      const adminsList = allUsers.filter(user => user.role === 'admin');

      console.log('Profile breakdown:', {
        total: allUsers.length,
        drivers: driversList.length,
        admins: adminsList.length,
        driversList
      });

      const sortedUsers = [...driversList, ...adminsList].sort((a, b) => {
        if (a.role === 'driver' && b.role === 'admin') return -1;
        if (a.role === 'admin' && b.role === 'driver') return 1;
        return (a.full_name || a.email).localeCompare(b.full_name || b.email);
      });

      setDrivers(sortedUsers);

    } catch (error: any) {
      console.error('Failed to load users:', error);
      setDriversError('Failed to load available users. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load available users",
        variant: "destructive",
      });
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleRefreshDrivers = () => {
    loadDrivers();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="driver" className="flex items-center gap-2">
        <User className="w-4 h-4" />
        Assign Driver
        {!loadingDrivers && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshDrivers}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </Label>
      
      {driversError && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">{driversError}</p>
        </div>
      )}

      <Select value={selectedDriverId} onValueChange={onDriverChange} disabled={loadingDrivers}>
        <SelectTrigger>
          <SelectValue placeholder={loadingDrivers ? "Loading users..." : "Select driver (optional)"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">No driver assigned</SelectItem>
          {drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id}>
              <div className="flex items-center gap-2">
                <span>{driver.full_name || driver.email}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  driver.role === 'driver' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {driver.role}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!loadingDrivers && drivers.length > 0 && (
        <p className="text-sm text-gray-600">
          Found {drivers.filter(d => d.role === 'driver').length} driver(s) and {drivers.filter(d => d.role === 'admin').length} admin(s) available for assignment.
        </p>
      )}
    </div>
  );
}
